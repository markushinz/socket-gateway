import { Router } from 'express'
import { OuterLayerConfig } from '..'
import { Gateway } from '../gateway'
import { EvaluateTool } from '../tools/evaluate'

export function newAdminRouter(config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool): Router {
    const router = Router()

    const adminCredentialsParsed = (() => {
        if (config['admin-password']) {
            return Buffer.from(`admin:${config['admin-password']}`).toString('base64')
        } else {
            return undefined
        }
    })()
    
    router.use(function (req, res, next) {
        if (adminCredentialsParsed) {
            if (req.headers.authorization === `Basic ${adminCredentialsParsed}`) {
                next()
            } else {
                res.setHeader('www-authenticate', 'Basic realm="Socket Gateway"')
                res.sendStatus(401)
            }
        } else {
            res.sendStatus(404)
        }
    })

    router.get('/', function (req, res) {
        res.setHeader('content-type', 'text/html; charset=utf-8')
        res.send(`<!DOCTYPE html>
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
`)
    })

    router.get('/stylesheet.css', function (req, res) {
        res.setHeader('content-type', 'text/css; charset=utf-8')
        res.send(`html {
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
`)
    })

    return router
}
