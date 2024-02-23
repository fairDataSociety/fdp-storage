import { exec } from 'child_process'

export async function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        return reject(error)
      }

      resolve(stdout)
    })
  })
}
