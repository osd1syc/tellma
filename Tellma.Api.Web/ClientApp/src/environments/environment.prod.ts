export const environment = {
  production: true
};

export const appsettings =
{
  apiAddress: null,
  identityAddress: null,
  identityConfig: {
      jwks: {
          keys: [
              {
                  kty: 'RSA',
                  use: 'sig',
                  kid: '8B944A1EA8C3C624E050DD43EE0E7CD65A1F9042RS256',
                  x5t: 'i5RKHqjDxiTgUN1D7g581lofkEI',
                  e: 'AQAB',
                  n: '3EhIqTOvFAe7ONNYeCZGD0rFW6kQEQf50NT5Zmd7cYHT5CLdQvOLmoPILNew6ki6bg3eWBA3gYlo6BlUYz9U1EVvUj0egnVg-BYoXv1a7xc6sSY2vhwzOn6X8d0otdeInY-04xOmPf5kBIu9PZKNqgr9R7jvGjNhh5Cbj4doHQ4ukOAVbw5kcq57DPb7pEPvqnHaMYHN06Q4Pfi8FPN82nfkyiIDUw_lDLZBUmKUhZkNwIeGleFbxblWm76xd-MYgQ9pU_oDtBiOnuhw7fOu8q_w4i4PPibHm3teFUhKZb3lUqdtYS7Rw-ZTLoHyB2a2VFlM5jnbX3h6iziYXf0HjstTU9yxcvAKiiEDO_NpdITMN2FMHkJiLkM6W17ogqrwfjcvtiegZS1s161FM4g7DLFtUvO5lIEDBjs2dP3Q23eVMPRWZTb1xozAhRmv6Q9pR6j20R1gn1JpBZEo4_Bx1smMHRo55L5q6P0aKGA5TUuWJMQLgrk_V7L_XgyQ_UWKFN_84EIQkML1aPC_589z0FdzIPr6T-Pu9qeZN0Obj-20v3bCwUBtROULAwHOqkttrQFrQ9DtX9JW03EINr8zjXCuYhz3NOFahjW3IX6OysN1r0U-j7tf8PvWrTl_7trdJNnzD8lkFbGgnc1xgpSF0WTkSlDqum_sX41_Kbo0nfc',
                  x5c: [
                      'MIIFFTCCAv2gAwIBAgIUOl7EIKcjJJYoZYQroAVgy33V9YcwDQYJKoZIhvcNAQELBQAwGTEXMBUGA1UEAwwOd2ViLnRlbGxtYS5jb20wIBcNMjAwMzA4MDUxMDE1WhgPMjA1MDA0MjAwNTEwMTVaMBkxFzAVBgNVBAMMDndlYi50ZWxsbWEuY29tMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA3EhIqTOvFAe7ONNYeCZGD0rFW6kQEQf50NT5Zmd7cYHT5CLdQvOLmoPILNew6ki6bg3eWBA3gYlo6BlUYz9U1EVvUj0egnVg+BYoXv1a7xc6sSY2vhwzOn6X8d0otdeInY+04xOmPf5kBIu9PZKNqgr9R7jvGjNhh5Cbj4doHQ4ukOAVbw5kcq57DPb7pEPvqnHaMYHN06Q4Pfi8FPN82nfkyiIDUw/lDLZBUmKUhZkNwIeGleFbxblWm76xd+MYgQ9pU/oDtBiOnuhw7fOu8q/w4i4PPibHm3teFUhKZb3lUqdtYS7Rw+ZTLoHyB2a2VFlM5jnbX3h6iziYXf0HjstTU9yxcvAKiiEDO/NpdITMN2FMHkJiLkM6W17ogqrwfjcvtiegZS1s161FM4g7DLFtUvO5lIEDBjs2dP3Q23eVMPRWZTb1xozAhRmv6Q9pR6j20R1gn1JpBZEo4/Bx1smMHRo55L5q6P0aKGA5TUuWJMQLgrk/V7L/XgyQ/UWKFN/84EIQkML1aPC/589z0FdzIPr6T+Pu9qeZN0Obj+20v3bCwUBtROULAwHOqkttrQFrQ9DtX9JW03EINr8zjXCuYhz3NOFahjW3IX6OysN1r0U+j7tf8PvWrTl/7trdJNnzD8lkFbGgnc1xgpSF0WTkSlDqum/sX41/Kbo0nfcCAwEAAaNTMFEwHQYDVR0OBBYEFI5FHuraW1ugbAdDYSLoIJOnJLFiMB8GA1UdIwQYMBaAFI5FHuraW1ugbAdDYSLoIJOnJLFiMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggIBANjUgFEwo19CieUjQ/cAgA/hZe9OMxMGBCzhiVp8cLRA9DrTDmXIP7KhnnHHXLdvD6PGaBUjiUOwZoS2REPGCGZ/qQ5uqm82am0pctwpz7nBe+ybn0WPcReBGVZPvTjIgTYc1KSwqOXKw/fbicaY/V6UGxojHQV9lah3NKbjUWe0LMGH3pGe+qQwo6v2mGaMo92QvAtsAcyKeVVY3ernxg3Q5jzfHfzPyNyrDZ83whXSPSYORquq6VBc59lkaH7vZsYOnJHWUR6ibF9AxwQeo+PjU5bS4E9zVvWeC2+nrkYnKanQRuwPpZuVKb3b0qg3+AxW5udJ/VLB2eh11YDZ2MViPoELeR+NbmX9bAh2nn9AzJcHkw1uFv1jfB1eUYo77nPdd5HQInXWQOhdNmX7D8ZyiP+naidMM41OwzYlVS5Wcv8haYYLOGJfnrTnKOL+Hikb5fXob/lsRT3Gqi/KII9Us/zBA3HP86VIhF/nJzvtiwj2iqwccScW/nCEV5B9eLvRGYGenzVbltzP9TtMLzM9fscPefnAqVkNuitnck/OAMJDmLxFN97HOqUJQiVTrJ1yW3YZVZ9/3uPXlDaLRv1YoZqAa4IUG1+TN0uKgZbKFFs4/1WPJE16N0i6rSu6ytCJEHgVrL9hLQaZZc9Ro8Xgj7QAwsHw9WFbm71ixIqX'
                  ],
                  alg: 'RS256'
              }
          ]
      },
      loginUrl: '/connect/authorize',
      sessionCheckIFrameUrl: '/connect/checksession',
      logoutUrl: '/connect/endsession',
      tokenRefreshPeriodInSeconds: 3600
  }
};
