import axios, { AxiosResponse } from 'axios'
import FormData from 'form-data'

export class FairOSApi {
  public withCredentials = true

  public cookies = ''

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
   * Register new V1 user
   */
  async registerV1(username: string, password: string, mnemonic?: string): Promise<AxiosResponse> {
    const url = this.getV1Url('user/signup')

    return this.handleCookies(
      await axios.post(url, {
        user_name: username,
        password,
        mnemonic,
      }),
    )
  }

  /**
   * Gets user stat
   */
  async stat(username: string): Promise<AxiosResponse> {
    const url = this.getV1Url('user/stat')

    return axios.get(url, {
      params: {
        user_name: username,
      },
      headers: {
        Cookie: this.cookies,
      },
    })
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

  /**
   * Opens a pod
   *
   * @param name pod name
   * @param password account password
   */
  async podOpen(name: string, password: string): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/open')

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

  /**
   * Closes a pod
   *
   * @param name pod name
   */
  async podClose(name: string): Promise<AxiosResponse> {
    const url = this.getV1Url('pod/close')

    return axios.post(
      url,
      {
        pod_name: name,
      },
      {
        headers: {
          Cookie: this.cookies,
        },
      },
    )
  }

  /**
   * Gets directories list
   */
  async dirLs(podName: string, dirPath = '/'): Promise<AxiosResponse> {
    const url = this.getV1Url('dir/ls')

    return axios.get(url, {
      params: {
        dir_path: dirPath,
        pod_name: podName,
      },
      headers: {
        Cookie: this.cookies,
      },
    })
  }

  /**
   * Make a directory
   *
   * @param podName pod name
   * @param directoryPath directory path
   * @param password account password
   */
  async dirMkdir(podName: string, directoryPath: string, password: string): Promise<AxiosResponse> {
    const url = this.getV1Url('dir/mkdir')

    return axios.post(
      url,
      {
        pod_name: podName,
        dir_path: directoryPath,
        password,
      },
      {
        headers: {
          Cookie: this.cookies,
        },
      },
    )
  }

  /**
   * Downloads a file
   *
   * @param podName pod name
   * @param filePath directory path
   */
  async fileDownload(podName: string, filePath: string): Promise<AxiosResponse> {
    const url = this.getV1Url('file/download')

    return axios.post(
      url,
      {},
      {
        params: {
          pod_name: podName,
          file_path: filePath,
        },
        headers: {
          Cookie: this.cookies,
        },
      },
    )
  }

  /**
   * Uploads a file
   *
   * @param podName pod name
   * @param dirPath directory path
   * @param content file content
   * @param fileName filename
   * @param blockSize block size of a file
   */
  async fileUpload(
    podName: string,
    dirPath: string,
    content: string,
    fileName: string,
    blockSize = '1Mb',
  ): Promise<AxiosResponse> {
    const url = this.getV1Url('file/upload')
    const form = new FormData()
    form.append('files', content, { filename: fileName })
    form.append('block_size', blockSize)
    form.append('pod_name', podName)
    form.append('dir_path', dirPath)

    return axios.post(url, form, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Cookie: this.cookies,
      },
    })
  }
}
