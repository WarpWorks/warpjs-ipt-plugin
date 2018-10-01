const RoutesInfo = require('@quoin/expressjs-routes-info');
const { routes } = require('./../lib/constants');
const assessment = require('./assessment');

// const docx = require('./docx');
// const wizard = require('./wizard');
const assessments = require('./assessments');
const root = require('./root');

module.exports = (baseUrl) => {
    const routesInfo = new RoutesInfo('/', baseUrl);

    routesInfo.route(routes.root, '/', root);
    // routesInfo.route(routes.questionnaire, '/{id}', questionnaire);
    routesInfo.route(routes.assessment, '/{surveyId}/{assessmentId}', assessment);
    // routesInfo.route(constants.routes.docx, '/{domain}/wizard/{wizardId}/docx', docx);
    // routesInfo.route(routes.wizard, '/{domain}/wizard/{wizardId}', wizard);

    return routesInfo;
};
