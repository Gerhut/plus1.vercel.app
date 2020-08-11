import { request } from '@octokit/request'
import { RequestError } from '@octokit/request-error'
import { makeBadge } from 'badge-maker'

const { GITHUB_TOKEN } = process.env

const REACTION_EMOJI = {
  '+1': '👍',
  '-1': '👎',
  laugh: '😄',
  confused: '😕',
  heart: '❤️',
  hooray: '🎉',
  rocket: '🚀',
  eyes: '👀'
}

/**
 * @param {string} owner
 * @param {string} repo
 * @param {number} issueNumber
 * @param {'+1'|'-1'|'laugh'|'confused'|'heart'|'hooray'|'rocket'|'eyes'} reactionType
 * @returns {Promise<number>}
 */
async function getReactionCount (owner, repo, issueNumber, reactionType) {
  const { data: issue } = await request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
    owner,
    repo,
    issue_number: issueNumber,
    headers: {
      authorization: GITHUB_TOKEN != null ? `token ${GITHUB_TOKEN}` : undefined
    },
    mediaType: {
      previews: [
        'squirrel-girl'
      ]
    }
  })

  console.log(issue)

  return issue.reactions[reactionType]
}

/**
 * @param {import('http').IncomingMessage} request
 * @param {import('http').ServerResponse} response
 */
export default async function api (request, response) {
  const { url } = request
  const { pathname, searchParams } = new URL(url, 'http://localhost/')
  const match = pathname.match(/^\/([A-Za-z0-9-]+)\/([A-Za-z0-9-_.]+)\/issues\/([1-9]\d*)(?:\/(\+1|-1|laugh|confused|heart|hooray|rocket|eyes))?$/)
  if (match == null) {
    return response.writeHead(400)
      .end('Invalid URL')
  }
  const [, owner, repo, issueNumber, reactionType = '+1'] = match
  try {
    const reactionCount = await getReactionCount(owner, repo, Number(issueNumber), reactionType)

    const body = makeBadge({
      label: searchParams.has('label') ? searchParams.get('label') : REACTION_EMOJI[reactionType],
      message: String(reactionCount)
    })
    response.writeHead(200, {
      'Content-Type': 'image/svg+xml'
    }).end(body)
  } catch (error) {
    console.error(error)
    if (error instanceof RequestError) {
      response.writeHead(error.status).end(error.message)
    } else {
      response.writeHead(500).end(error.message)
    }
  }
}
