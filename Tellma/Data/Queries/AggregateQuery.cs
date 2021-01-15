﻿using Tellma.Entities;
using Microsoft.Extensions.Localization;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using Tellma.Entities.Descriptors;
using Tellma.Services.Utilities;

namespace Tellma.Data.Queries
{
    /// <summary>
    /// Used to execute GROUP BY queries on a SQL Server database
    /// </summary>
    /// <typeparam name="T">The expected type of the result</typeparam>
    public class AggregateQuery<T> where T : Entity
    {
        // From constructor
        private readonly QueryArgumentsFactory _factory;

        // Through setter methods
        private int? _top;
        private List<ExpressionFilter> _filterConditions;
        private ExpressionHaving _having;
        private ExpressionAggregateSelect _select;
        private ExpressionAggregateOrderBy _orderby;
        private List<SqlParameter> _additionalParameters;

        /// <summary>
        /// Creates an instance of <see cref="AggregateQuery{T}"/>
        /// </summary>
        /// <param name="conn">The connection to use when loading the results</param>
        /// <param name="sources">Mapping from every type into SQL code that can be used to query that type</param>
        /// <param name="localizer">For validation error messages</param>
        /// <param name="userId">Used as context when preparing certain filter expressions</param>
        /// <param name="userTimeZone">Used as context when preparing certain filter expressions</param>
        public AggregateQuery(QueryArgumentsFactory factory)
        {
            _factory = factory ?? throw new ArgumentNullException(nameof(factory));
        }

        /// <summary>
        /// Clones the <see cref="AggregateQuery{T}"/> into a new one. Used internally
        /// </summary>
        private AggregateQuery<T> Clone()
        {
            var clone = new AggregateQuery<T>(_factory)
            {
                _top = _top,
                _filterConditions = _filterConditions?.ToList(),
                _having = _having,
                _select = _select,
                _orderby = _orderby,
                _additionalParameters = _additionalParameters?.ToList()
            };

            return clone;
        }

        /// <summary>
        /// Applies a <see cref="ExpressionAggregateSelect"/> to specify which dimensions and measures
        /// must be returned, dimensions are specified without an aggregate function, measures do not have an aggregate function
        /// </summary>
        public AggregateQuery<T> Select(ExpressionAggregateSelect selects)
        {
            var clone = Clone();
            clone._select = selects;
            return clone;
        }

        /// <summary>
        /// Applies a <see cref="ExpressionAggregateOrderBy"/> to specify which dimensions and measures
        /// must be returned, dimensions are specified without an aggregate function, measures do not have an aggregate function
        /// </summary>
        public AggregateQuery<T> OrderBy(ExpressionAggregateOrderBy orderby)
        {
            var clone = Clone();
            clone._orderby = orderby;
            return clone;
        }

        /// <summary>
        /// Applies a <see cref="ExpressionFilter"/> to filter the result
        /// </summary>
        public AggregateQuery<T> Filter(ExpressionFilter condition)
        {
            if (_top != null)
            {
                // Programmer mistake
                throw new InvalidOperationException($"Cannot filter the query after {nameof(Top)} has been invoked");
            }

            var clone = Clone();
            if (condition != null)
            {
                clone._filterConditions ??= new List<ExpressionFilter>();
                clone._filterConditions.Add(condition);
            }

            return clone;
        }

        /// <summary>
        /// Applies a <see cref="ExpressionHaving"/> to filter the grouped result
        /// </summary>
        public AggregateQuery<T> Having(ExpressionHaving having)
        {
            if (_top != null)
            {
                // Programmer mistake
                throw new InvalidOperationException($"Cannot apply a having argument after {nameof(Top)} has been invoked");
            }

            var clone = Clone();
            clone._having = having;
            return clone;
        }

        /// <summary>
        /// Instructs the query to load only the top N rows
        /// </summary>
        public AggregateQuery<T> Top(int top)
        {
            var clone = Clone();
            clone._top = top;
            return clone;
        }

        /// <summary>
        /// If the Query is for a parametered fact table such as <see cref="SummaryEntry"/>, the parameters
        /// must be supplied this method must be supplied through this method before loading any data
        /// </summary>
        public AggregateQuery<T> AdditionalParameters(params SqlParameter[] parameters)
        {
            var clone = Clone();
            if (clone._additionalParameters == null)
            {
                clone._additionalParameters = new List<SqlParameter>();
            }

            clone._additionalParameters.AddRange(parameters);

            return clone;
        }

        public async Task<List<DynamicRow>> ToListAsync(CancellationToken cancellation)
        {
            var args = await _factory(cancellation);

            var conn = args.Connection;
            var sources = args.Sources;
            var userId = args.UserId;
            var userToday = args.UserToday;
            var localizer = args.Localizer;

            // ------------------------ Validation Step

            // SELECT Validation
            ExpressionAggregateSelect selectExp = _select;
            if (selectExp == null)
            {
                string message = $"The select argument is required";
                throw new InvalidOperationException(message);
            }

            // Make sure that measures are well formed: every column access is wrapped inside an aggregation function
            foreach (var exp in selectExp)
            {
                if (exp.ContainsAggregations) // This is a measure
                {
                    // Every column access must descend from an aggregation function
                    var exposedColumnAccess = exp.UnaggregatedColumnAccesses().FirstOrDefault();
                    if (exposedColumnAccess != null)
                    {
                        throw new QueryException($"Select parameter contains a measure with a column access {exposedColumnAccess} that is not included within an aggregation.");
                    }
                }
            }

            // ORDER BY Validation
            ExpressionAggregateOrderBy orderbyExp = _orderby;
            if (orderbyExp != null)
            {
                var selectedDims = selectExp.Where(e => !e.ContainsAggregations); // Every dimension in orderby must also be present in select

                foreach (var exp in orderbyExp)
                {
                    // Order by cannot be a constant
                    if (!exp.ContainsAggregations && !exp.ContainsColumnAccesses)
                    {
                        throw new QueryException("OrderBy parameter cannot be a constant, every order by expression must contain either an aggregation or a column access.");
                    }

                    // If it's a dimension, it must be mentioned in the select
                    if (!exp.ContainsAggregations)
                    {
                        // TODO
                    }
                }
            }

            // FILTER Validation
            ExpressionFilter filterExp = null;
            if (_filterConditions != null)
            {
                var conditionWithAggregation = _filterConditions.FirstOrDefault(e => e.Expression.ContainsAggregations);
                if (conditionWithAggregation != null)
                {
                    throw new QueryException($"Filter contains a condition with an aggregation function: {conditionWithAggregation}");
                }

                filterExp = _filterConditions.Aggregate(
                    (e1, e2) => ExpressionFilter.Conjunction(e1, e2)); // AND the conditions together
            }


            // HAVING Validation
            ExpressionHaving havingExp = _having;
            if (havingExp != null)
            {
                // Every column access must descend from an aggregation function
                var exposedColumnAccess = havingExp.Expression.UnaggregatedColumnAccesses().FirstOrDefault();
                if (exposedColumnAccess != null)
                {
                    throw new QueryException($"Having parameter contains a column access {exposedColumnAccess} that is not included within an aggregation.");
                }

            }

            //// ------------------------ Tree analysis
            //// Grab all paths that contain a Parent property, and 
            //var trees = new List<(Type TreeType, ArraySegment<string> PathToTreeEntity, ArraySegment<string> PathFromTreeEntity, string Property)>();
            //var treeAtoms = new HashSet<SelectAggregateAtom>();
            //foreach (var atom in dtoableAtoms)
            //{
            //    var currentType = typeof(T);
            //    for (var i = 0; i < atom.Path.Length; i++)
            //    {
            //        var step = atom.Path[i];
            //        var pathProp = currentType.GetProperty(step);
            //        if (pathProp.IsParent())
            //        {
            //            var treeType = currentType;
            //            var pathToTreeEntity = new ArraySegment<string>(atom.Path, 0, i);
            //            var pathFromTreeEntity = new ArraySegment<string>(atom.Path, i + 1, atom.Path.Length - (i + 1));
            //            var property = atom.Property;

            //            trees.Add((treeType, pathToTreeEntity, pathFromTreeEntity, property));
            //            treeAtoms.Add(atom);
            //        }

            //        currentType = pathProp.PropertyType;
            //    }

            //    var prop = currentType.GetProperty(atom.Property);
            //}

            //// Keep only the paths that are not a DTOable trees, those will be loaded separately
            //selectExp = new SelectAggregateExpression(selectExp.Where(e => treeAtoms.Contains(e)));


            // Prepare the internal query (this one should not have any select paths containing Parent property)
            StatementBuilder builder = new StatementBuilder
            {
                Select = selectExp,
                Filter = filterExp,
                OrderBy = orderbyExp,
                Having = havingExp,
                Top = _top
            };

            // Prepare the variables and parameters
            var vars = new SqlStatementVariables();
            var ps = new SqlStatementParameters(_additionalParameters);

            SqlDynamicStatement statement = builder.BuildStatement(sources, vars, ps, userId, userToday);

            // load the rows and return them
            var result = await EntityLoader.LoadDynamicStatement(
                statement: statement,
                vars: vars,
                ps: ps,
                conn: conn,
                cancellation: cancellation);

            return result;
        }

        /// <summary>
        /// Responsible for creating an <see cref="SqlDynamicStatement"/> based on some query parameters.
        /// </summary>
        private class StatementBuilder
        {
            /// <summary>
            /// The select parameter, should NOT contain collection nav properties or tree nav properties (Parent)
            /// </summary>
            public ExpressionAggregateSelect Select { get; set; }

            /// <summary>
            /// The orderby parameter
            /// </summary>
            public ExpressionAggregateOrderBy OrderBy { get; set; }

            /// <summary>
            /// The filter parameter
            /// </summary>
            public ExpressionFilter Filter { get; set; }

            /// <summary>
            /// The having parameter
            /// </summary>
            public ExpressionHaving Having { get; set; }

            /// <summary>
            /// The top parameter
            /// </summary>
            public int? Top { get; set; }

            /// <summary>
            /// Implementation of <see cref="IQueryInternal"/> 
            /// </summary>
            public SqlDynamicStatement BuildStatement(
                Func<Type, string> sources,
                SqlStatementVariables vars,
                SqlStatementParameters ps,
                int userId,
                DateTime? userToday)
            {
                // (1) Prepare the JOIN's clause
                var joinTrie = PrepareJoin();
                var joinSql = joinTrie.GetSql(sources, fromSql: null);

                // Compilation context
                var today = userToday ?? DateTime.Today;
                var ctx = new QxCompilationContext(joinTrie, sources, vars, ps, today, userId);

                // (2) Prepare all the SQL clauses
                var (selectSql, groupbySql, columnCount) = PrepareSelectAndGroupBySql(ctx);
                string whereSql = PrepareWhereSql(ctx);
                string havingSql = PrepareHavingSql(ctx);
                string orderbySql = PrepareOrderBySql(ctx);

                // (3) Put together the final SQL statement and return it
                string sql = QueryTools.CombineSql(
                        selectSql: selectSql,
                        joinSql: joinSql,
                        principalQuerySql: null,
                        whereSql: whereSql,
                        orderbySql: orderbySql,
                        offsetFetchSql: null,
                        groupbySql: groupbySql,
                        havingSql: havingSql
                    );

                // (8) Return the result
                return new SqlDynamicStatement(sql, columnCount);
            }

            /// <summary>
            /// Prepares the join tree 
            /// </summary>
            private JoinTrie PrepareJoin()
            {
                // construct the join tree
                var allPaths = new List<string[]>();
                if (Select != null)
                {
                    allPaths.AddRange(Select.ColumnAccesses().Select(e => e.Path));
                }

                if (OrderBy != null)
                {
                    allPaths.AddRange(OrderBy.ColumnAccesses().Select(e => e.Path));
                }

                if (Filter != null)
                {
                    allPaths.AddRange(Filter.ColumnAccesses().Select(e => e.Path));
                }

                if (Having != null)
                {
                    allPaths.AddRange(Having.ColumnAccesses().Select(e => e.Path));
                }

                // This will represent the mapping from paths to symbols
                var joinTree = JoinTrie.Make(TypeDescriptor.Get<T>(), allPaths);
                return joinTree;
            }

            private (string select, string groupby, int columnCount) PrepareSelectAndGroupBySql(QxCompilationContext ctx)
            {
                List<string> selects = new List<string>(Select.Count());
                List<string> groupbys = new List<string>();

                // This is to make the group by list unique
                HashSet<QueryexBase> groupbyHash = new HashSet<QueryexBase>();

                foreach (var exp in Select)
                {
                    var (sql, type, _) = exp.CompileNative(ctx);
                    if (type == QxType.Boolean || type == QxType.HierarchyId || type == QxType.Geography)
                    {
                        // Those three types are not supported for loading into C#
                        throw new QueryException($"A select expression {exp} cannot have a type {type}.");
                    }
                    else
                    {
                        sql = sql.DeBracket();
                        selects.Add(sql);
                        if (!exp.ContainsAggregations && groupbyHash.Add(exp))
                        {
                            groupbys.Add(sql);
                        }
                    }
                }

                // Prepare 
                string top = Top == 0 ? "" : $"TOP {Top} ";
                string selectSql = $"SELECT {top}" + string.Join(", ", selects);

                string groupbySql = "";
                if (groupbys.Count > 0)
                {
                    groupbySql = "GROUP BY " + string.Join(", ", groupbys);
                }

                return (selectSql, groupbySql, selects.Count);
            }

            /// <summary>
            /// Prepares the WHERE clause of the SQL query from the <see cref="Filter"/> argument: WHERE ABC
            /// </summary>
            private string PrepareWhereSql(QxCompilationContext ctx)
            {
                string whereSql = Filter?.Expression?.CompileToBoolean(ctx)?.DeBracket();

                // Add the "WHERE" keyword
                if (!string.IsNullOrEmpty(whereSql))
                {
                    whereSql = "WHERE " + whereSql;
                }

                return whereSql;
            }

            /// <summary>
            /// Prepares the WHERE clause of the SQL query from the <see cref="Filter"/> argument: WHERE ABC
            /// </summary>
            private string PrepareHavingSql(QxCompilationContext ctx)
            {
                string havingSql = Having?.Expression?.CompileToBoolean(ctx)?.DeBracket();

                // Add the "HAVING" keyword
                if (!string.IsNullOrEmpty(havingSql))
                {
                    havingSql = "HAVING " + havingSql;
                }

                return havingSql;
            }

            /// <summary>
            /// Prepares the ORDER BY clause of the SQL query using the <see cref="Select"/> argument: ORDER BY ABC
            /// </summary>
            private string PrepareOrderBySql(QxCompilationContext ctx)
            {
                var orderByAtomsCount = OrderBy?.Count() ?? 0;
                if (orderByAtomsCount == 0)
                {
                    return "";
                }

                List<string> orderbys = new List<string>(orderByAtomsCount);
                foreach (var expression in OrderBy)
                {
                    string orderby = expression.CompileToNonBoolean(ctx);
                    if (expression.IsDescending)
                    {
                        orderby += " DESC";
                    }
                    else
                    {
                        orderby += " ASC";
                    }

                    orderbys.Add(orderby);
                }

                return "ORDER BY " + string.Join(", ", orderbys);
            }
        }
    }
}
