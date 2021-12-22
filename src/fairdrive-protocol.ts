import { Bee } from '@ethersphere/bee-js'

export class FairdriveProtocol {
  public readonly bee: Bee

  constructor(url: string) {
    // todo assert url
    this.bee = new Bee(url)
  }

  async userLogin(username: string, password: string) {
    const data = this.bee.downloadChunk('7221728eaf8f4901982703656dd9c9b0e42baffc058b223476428a134010dc04')
    console.log(data)
  }
}
