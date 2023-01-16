let fdpStorage = null
let pod = null
let postageStamp = getPostageStamp()

if (postageStamp) {
  document.getElementById('stamp').value = postageStamp
}

function checkFdp() {
  if (!fdpStorage) {
    throw new Error('fdpStorage is empty')
  }
}

function checkPod() {
  if (!pod) {
    throw new Error('pod name is empty')
  }
}

function getValue(id) {
  const podName = document.getElementById(id).value

  if (!podName) {
    throw new Error(`Empty value for "${id}"`)
  }

  return podName
}

function createFdpStorage() {
  fdpStorage = new window.fdp.FdpStorage('http://localhost:1633', postageStamp)
  console.log('fdpStorage', fdpStorage)
}

async function createPod() {
  checkFdp()
  const podName = getValue('pod-name')
  await fdpStorage.personalStorage.create(podName)
  pod = podName
  console.log('pod created', podName)
}

function createAccount() {
  checkFdp()

  const wallet = fdpStorage.account.createWallet()
  console.log('wallet', wallet)
}

async function podsList() {
  checkFdp()

  const pods = await fdpStorage.personalStorage.list()
  console.log('pods list', pods)
}

async function filesList() {
  checkFdp()

  const podName = getValue('pod-name-files')
  const path = getValue('path-files')
  const files = await fdpStorage.directory.read(podName, path, true)
  console.log('files', files)
}

async function uploadDirectory() {
  checkFdp()

  const podName = getValue('pod-name-directory')
  const path = getValue('path-directory')
  const files = document.getElementById('upload-directory').files

  if (!files || !files.length) {
    throw new Error('Files list is empty')
  }

  await fdpStorage.directory.upload(podName, files, path, { isRecursive: true })
  console.log('uploadDirectory done')
}

async function readBrowseFileAsBytes(file) {
  const arrayBuffer = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })

  return new Uint8Array(arrayBuffer)
}

async function uploadFile() {
  checkFdp()

  const podName = getValue('pod-name-file')
  const path = getValue('path-file')
  const files = document.getElementById('upload-file').files

  if (!files || !files.length) {
    throw new Error('Files list is empty')
  }

  const file = await readBrowseFileAsBytes(files[0])
  const result = await fdpStorage.file.uploadData(podName, path, file)
  console.log('uploadFile result', result)
}

function setPostageStamp() {
  const stamp = getValue('stamp')

  if (!stamp) {
    throw new Error('Empty postage stamp')
  }

  localStorage.setItem('fdp-stamp', stamp)
  postageStamp = stamp
}

function getPostageStamp() {
  return localStorage.getItem('fdp-stamp')
}

function saveAs(data, name) {
  const blob = new Blob([data], { type: 'application/octet-stream' })
  const file = new File([blob], name, { type: 'application/octet-stream' })
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file)
  link.download = file.name
  document.body.appendChild(link)
  link.click()
}

async function downloadFile() {
  checkFdp()

  const podName = getValue('pod-name-download-file')
  const path = getValue('path-download-file')
  const name = path.split('/').pop()
  const result = await fdpStorage.file.downloadData(podName, path)
  saveAs(result, name)
}
