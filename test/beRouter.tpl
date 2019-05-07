const koaRouter = require('koa-router');
// tpl/import : const <%=name%>API = require('../controllers/<%=name%>Controller.js');

const router = koaRouter()


// tpl/router : router.get('/<%=name%>/:id', <%=name%>API.get);
// tpl/router : router.post('/<%=name%>/:id/create', <%=name%>API.create<%=ModelName%>);
// tpl/router : router.get('/<%=name%>/:id/update', <%=name%>API.update);


module.exports = router;