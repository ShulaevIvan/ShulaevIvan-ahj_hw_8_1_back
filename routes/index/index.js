const Router = require('koa-router');
const router = new Router();
router.allowedMethods();

router.get('/index', async (ctx) => {
    ctx.response.body = 'test'
    ctx.response.status = 200;
});

module.exports = router