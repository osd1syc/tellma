﻿// <auto-generated />
using BSharp.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BSharp.Data.Migrations.Admin
{
    [DbContext(typeof(AdminContext))]
    [Migration("20181220112838_Initial")]
    partial class Initial
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "2.2.0-rtm-35687")
                .HasAnnotation("Relational:MaxIdentifierLength", 128)
                .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

            modelBuilder.Entity("BSharp.Data.Model.Culture", b =>
                {
                    b.Property<string>("Id")
                        .ValueGeneratedOnAdd()
                        .HasMaxLength(255);

                    b.Property<bool>("IsActive");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasMaxLength(255);

                    b.HasKey("Id");

                    b.ToTable("Cultures");

                    b.HasData(
                        new
                        {
                            Id = "en",
                            IsActive = true,
                            Name = "English"
                        },
                        new
                        {
                            Id = "ar",
                            IsActive = true,
                            Name = "العربية"
                        });
                });

            modelBuilder.Entity("BSharp.Data.Model.Shard", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

                    b.Property<string>("ConnectionString")
                        .IsRequired()
                        .HasMaxLength(255);

                    b.Property<string>("Name")
                        .HasMaxLength(255);

                    b.HasKey("Id");

                    b.ToTable("Shards");

                    b.HasData(
                        new
                        {
                            Id = 1,
                            ConnectionString = "<ShardManager>",
                            Name = "Shard Manager"
                        });
                });

            modelBuilder.Entity("BSharp.Data.Model.Tenant", b =>
                {
                    b.Property<int>("Id");

                    b.Property<string>("Name");

                    b.Property<int>("ShardId");

                    b.HasKey("Id");

                    b.HasIndex("ShardId");

                    b.ToTable("Tenants");
                });

            modelBuilder.Entity("BSharp.Data.Model.Translation", b =>
                {
                    b.Property<string>("CultureId")
                        .HasMaxLength(255);

                    b.Property<string>("Name")
                        .HasMaxLength(450);

                    b.Property<string>("Tier")
                        .IsRequired()
                        .HasMaxLength(255);

                    b.Property<string>("Value")
                        .IsRequired()
                        .HasMaxLength(2048);

                    b.HasKey("CultureId", "Name");

                    b.ToTable("Translations");
                });

            modelBuilder.Entity("BSharp.Data.Model.Tenant", b =>
                {
                    b.HasOne("BSharp.Data.Model.Shard", "Shard")
                        .WithMany()
                        .HasForeignKey("ShardId")
                        .OnDelete(DeleteBehavior.Cascade);
                });

            modelBuilder.Entity("BSharp.Data.Model.Translation", b =>
                {
                    b.HasOne("BSharp.Data.Model.Culture", "Culture")
                        .WithMany()
                        .HasForeignKey("CultureId")
                        .OnDelete(DeleteBehavior.Cascade);
                });
#pragma warning restore 612, 618
        }
    }
}
