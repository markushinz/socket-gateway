import { RequestListener } from 'http'

import { OuterLayerConfig } from '..'
import { sendStatus } from '../../helpers'
import { Gateway } from '../gateway'
import { EvaluateTool } from '../tools/evaluate'

function html(config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool) {
    return `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="utf-8">
        <title>Socket Gateway</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" type="text/css" href="/admin/stylesheet.css">
    </head>
    
    <body>
        <div id="container">
            <h1>Socket Gateway</h1>
            <h3>Inner Layers</h3>
            <pre>${JSON.stringify(gateway.connections, null, 4)}</pre>
            <h3>Inner Layer Public Key</h3>
            <pre>${config['public-key']}</pre>
            <h3>Targets</h3>
            <pre>${JSON.stringify(evaluateTool.targetsParsed, null, 4)}</pre>
        </div>
    </body>
    
    </html>
    `
}

const stylesheet = `html {
    font-family: monospace, monospace;
    font-size:0.9em;
    margin: 15px;
}

pre {
    font-family: monospace, monospace;
    color: #666666;
    overflow: auto;
    border-color: #ccc;
    border-width: .05rem;
    border-style: solid;
    border-radius: .15rem;
}

#container {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
}

@media (min-width: 576px) {
    #container {
        max-width: 540px;
    }
}

@media (min-width: 768px) {
    #container {
        max-width: 720px;
    }
}

@media (min-width: 992px) {
    #container {
        max-width: 960px;
    }
}

@media (min-width: 1200px) {
    #container {
        max-width: 1140px;
    }
}
`

export function newAdminRouter(config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool): RequestListener {
    const adminCredentialsParsed = (() => {
        if (config['admin-password']) {
            return Buffer.from(`admin:${config['admin-password']}`).toString('base64')
        } else {
            return undefined
        }
    })()
    
    return function(req, res) {
        if (adminCredentialsParsed) {
            if (req.headers.authorization === `Basic ${adminCredentialsParsed}`) {
                const url = new URL(req.url || '', `http://${req.headers.host}`)
                if (['/admin', '/admin/'].includes(url.pathname) && req.method === 'GET') {
                    res.setHeader('content-type', 'text/html; charset=utf-8')
                    return sendStatus(req, res, 200, html(config, gateway, evaluateTool))
                }
                if (url.pathname === '/admin/stylesheet.css' && req.method === 'GET') {
                    res.setHeader('content-type', 'text/css; charset=utf-8')
                    return sendStatus(req, res, 200, stylesheet)
                }
                return sendStatus(req, res, 404)
            } else {
                res.setHeader('www-authenticate', 'Basic realm="Socket Gateway"')
                sendStatus(req, res, 401)
            }
        } else {
            sendStatus(req, res, 404)
        }
    }
}
