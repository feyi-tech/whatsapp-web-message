const { getBearerToken } = require("../utils")

module.exports = (publicPaths=[], isValidClient) => {
    return (req, res, next) => {
        const bearer = getBearerToken(req.headers.authorization)
        if(!publicPaths.includes(req.path) && !isValidClient(req, bearer)) {
            res.json({message: "Requires authentication"}).status(403)
    
        } else {
            next()
        }
    }
}
