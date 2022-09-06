import axios, { AxiosResponse } from 'axios'

export class FairOSApi {
  constructor(private apiUrl = 'http://localhost:9090/v2/') {}

  private getUrl(method: string) {
    return `${this.apiUrl}${method}`
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<AxiosResponse> {
    const url = this.getUrl('user/login')

    return axios.post(url, {
      user_name: username,
      password,
    })
  }

  /**
   * Creates new user
   */
  async register(username: string, password: string, mnemonic: string): Promise<AxiosResponse> {
    const url = this.getUrl('user/signup')

    return axios.post(url, {
      user_name: username,
      password,
      mnemonic,
    })
  }
}
