import axios, { AxiosResponse } from 'axios'

export class FairOSApi {
  public withCredentials = true

  private cookies = ''

  constructor(private apiUrlV1 = 'http://localhost:9090/v1/', private apiUrlV2 = 'http://localhost:9090/v2/') {}

  private getV2Url(method: string) {
    return `${this.apiUrlV2}${method}`
  }

  private getV1Url(method: string) {
    return `${this.apiUrlV1}${method}`
  }

  private handleCookies(response: AxiosResponse): AxiosResponse {
    if (this.withCredentials) {
      this.cookies = response.headers['set-cookie']?.[0] as string
    }

    return response
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<AxiosResponse> {
    const url = this.getV2Url('user/login')

    return this.handleCookies(
      await axios.post(url, {
        user_name: username,
        password,
      }),
    )
  }

  /**
   * Creates new user
   */
  async register(username: string, password: string, mnemonic: string): Promise<AxiosResponse> {
    const url = this.getV2Url('user/signup')

    return this.handleCookies(
      await axios.post(url, {
        user_name: username,
        password,
        mnemonic,
      }),
    )
  }

  /**
   * Gets pod list
   */
  async podLs(): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/ls')

    return axios.get(url, {
      headers: {
        Cookie: this.cookies,
      },
    })
  }

  /**
   * Creates new pod
   *
   * @param name pod name
   * @param password account password
   */
  async podNew(name: string, password: string): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/new')

    return axios.post(
      url,
      {
        pod_name: name,
        password,
      },
      {
        headers: {
          Cookie: this.cookies,
        },
      },
    )
  }
}
