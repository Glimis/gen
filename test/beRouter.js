const koaRouter = require('koa-router'); // tpl/import : const <%=name%>API = require('../controllers/<%=name%>Controller.js');


const testAPI = require('../controllers/testController.js');

const router = koaRouter(); // tpl/router : router.get('/<%=name%>/:id', <%=name%>API.get);
// tpl/router : router.post('/<%=name%>/:id/create', <%=name%>API.create<%=ModelName%>);
// tpl/router : router.get('/<%=name%>/:id/update', <%=name%>API.update);

router.get('/test/:id', testAPI.get);
router.post('/test/:id/create', testAPI.createTest);
router.get('/test/:id/update', testAPI.update);
module.exports = router;