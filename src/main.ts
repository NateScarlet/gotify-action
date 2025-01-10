import * as core from '@actions/core'

export async function run() {
  try {
    const buildStatus = core.getInput('result', { required: true })
    const url = core.getInput('url', { required: true })
    const token = core.getInput('token', { required: true })
    const refName = process.env['GITHUB_REF_NAME'] || ''
    const buildNumber = process.env['GITHUB_RUN_NUMBER'] || '-1'
    const commitSha = process.env['GITHUB_SHA'] || ''
    const commitMessage = core.getInput('commit-message')
    const actor = process.env['GITHUB_ACTOR'] || ''
    const buildLink =
      process.env['GITHUB_SERVER_URL'] +
      '/' +
      process.env['GITHUB_REPOSITORY'] +
      '/actions/runs/' +
      process.env['GITHUB_RUN_NUMBER']

    let statusMessage = ''
    let priority = 0
    if (buildStatus === 'success') {
      statusMessage = '🟢OK'
    } else if (buildStatus === 'failure') {
      statusMessage = '🔴FAIL'
      priority = 8
    } else {
      statusMessage = buildStatus
      priority = 4
    }

    const title = `${statusMessage} ${refName}#${buildNumber} ${commitSha.substring(0, 6)}`
    const message = `\
${commitMessage}
  by ${actor}
${buildLink}
`

    const resp = await fetch(`${url}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        message,
        priority,
        extras: {
          'client::notification': {
            click: { url: buildLink }
          }
        }
      })
    })
    if (resp.status === 200) {
      const body = (await resp.json()) as { errcode: number; errmsg: string }
      if (body.errcode) {
        core.setFailed(JSON.stringify(body))
      } else {
        core.info(JSON.stringify(body))
      }
    } else {
      core.setFailed(
        JSON.stringify({
          status: resp.status,
          body: await resp.text()
        })
      )
    }
  } catch (err) {
    core.setFailed(err instanceof Error ? err : String(err))
  }
}
