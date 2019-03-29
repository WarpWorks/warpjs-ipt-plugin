const _ = require('lodash');
const d3 = require('d3');

module.exports = ($, questionnaire, selector, type, answers, surveyDetailLevel, goToQuesiton) => {
    const width = 1200;
    const margin = ({top: 10, right: 120, bottom: 10, left: 40});
    const dy = width / 3.5;
    const dx = 20;

    let questionnaireChildren = {};
    if (type === 'progress') {
        questionnaireChildren = _.map(questionnaire._embedded.categories, (category, categoryIndex) => {
            let categoryChildren = [];

            const answerCategory = _.find(answers._embedded.categories, (answerCategory) => {
                return category.id === answerCategory.id;
            });

            if (category.isRepeatable && answerCategory._embedded.iterations) {
                categoryChildren = _.filter(_.map(answerCategory._embedded.iterations, (iteration, iterationIndex) => {
                    let oneAnswered = false;
                    let allAnswered = true;

                    const filteredQuestions = _.filter(iteration._embedded.questions, (question) => {
                        return parseInt(question.detailLevel, 10) <= parseInt(surveyDetailLevel, 10);
                    });
                    const iterationChildren = _.map(filteredQuestions, (question, questionIndex) => {
                        const categoryQuestion = _.find(category._embedded.questions, (catQuestion) => {
                            return catQuestion.id === question.id;
                        });

                        const isAnswered = question.answer !== undefined && question.answer !== null;
                        if (isAnswered) {
                            oneAnswered = true;
                        } else if (categoryQuestion._embedded && categoryQuestion._embedded.options.length > 0) {
                            allAnswered = false;
                        }

                        return {name: categoryQuestion.name, questionIndex: questionIndex, iterationIndex: iterationIndex, categoryIndex: categoryIndex, answered: isAnswered, hasOptions: categoryQuestion._embedded && categoryQuestion._embedded.options.length > 0, detailLevel: categoryQuestion.detailLevel, linkTo: true};
                    });

                    let answeredLevel = 'none';
                    if (allAnswered) {
                        answeredLevel = 'all';
                    } else if (oneAnswered) {
                        answeredLevel = 'one';
                    }

                    return {name: iteration.name, children: iterationChildren, answeredLevel: answeredLevel};
                }), (iteration) => {
                    return iteration.name !== null && iteration.name !== '';
                });
            } else {
                const filteredQuestions = _.filter(category._embedded.questions, (question) => {
                    return parseInt(question.detailLevel, 10) <= parseInt(surveyDetailLevel, 10);
                });

                categoryChildren = _.map(filteredQuestions, (question, questionIndex) => {
                    const answerQuestion = _.find(answerCategory._embedded.iterations[0]._embedded.questions, (aQuestion) => {
                        return aQuestion.id === question.id;
                    });

                    return {name: question.name, questionIndex: questionIndex, iterationIndex: 0, categoryIndex: categoryIndex, answered: answerQuestion.answer !== undefined && answerQuestion.answer !== null, hasOptions: question._embedded && question._embedded.options.length > 0, detailLevel: question.detailLevel, linkTo: true};
                });
            }

            return {name: category.name, children: categoryChildren, dataId: category.id};
        });
    } else {
        questionnaireChildren = _.map(questionnaire._embedded.categories, (category) => {
            const categoryChildren = _.filter(_.map(category._embedded.questions, (question) => {
                return {name: question.name, dataId: question.id, detailLevel: question.detailLevel};
            }), (question) => {
                return parseInt(question.detailLevel, 10) <= parseInt(surveyDetailLevel, 10);
            });
            return {name: category.name, children: categoryChildren, dataId: category.id};
        });
    }

    const data = {name: questionnaire.name, children: questionnaireChildren};
    const tree = d3.tree().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

    const root = d3.hierarchy(data);

    root.x0 = dy / 3.5;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.depth && d.data.name && d.data.name.length !== 7) {
            d.children = null;
        }
    });

    const svg = d3.select(selector)
        .attr("width", width)
        .attr("height", width)
        .attr("viewBox", [-margin.left, -margin.top, width, width])
        .style("font", "10px sans-serif")
        .style("user-select", "none");

    const child = svg.append("g")
        .attr("width", width)
        .attr("height", width);

    svg.call(d3.zoom().on("zoom", function() {
        child.attr("transform", d3.event.transform);
    }));

    const gLink = child.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    const gNode = child.append("g")
        .attr("cursor", "pointer");

    function update(source) {
        const duration = d3.event && d3.event.altKey ? 2500 : 250;
        const nodes = root.descendants().reverse();
        const links = root.links();

        tree(root);

        let left = root;
        let right = root;
        root.eachBefore(node => {
            if (node.x < left.x) {
                left = node;
            }
            if (node.x > right.x) {
                right = node;
            }
        });

        const height = Math.max(right.x - left.x + margin.top + margin.bottom, width);

        const transition = svg.transition()
            .duration(duration)
            .attr("height", height)
            .attr("viewBox", [-margin.left, left.x - margin.top, width, height])
            .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", d => {
                if (d._children) {
                    d.children = d.children ? null : d._children;
                    update(d);
                } else if (d.data.linkTo) {
                    goToQuesiton(d.data.questionIndex, d.data.iterationIndex, d.data.categoryIndex);
                }
            });

        nodeEnter.append("circle")
            .attr("r", 2.5)
            .attr("fill", d => {
                let color = d._children ? "#555" : "#999";
                if ((d.data.answered === true && d.data.hasOptions) || d.data.answeredLevel === 'all') {
                    color = '#5ca81e';
                } else if ((d.data.answered === false && d.data.hasOptions) || d.data.answeredLevel === 'none') {
                    color = '#de2a2d';
                } else if (d.data.answeredLevel === 'one') {
                    color = '#fcb830';
                }
                return color;
            });

        nodeEnter.append("text")
            .attr("dy", "0.31em")
            .style("font-size", "14px")
            .attr("x", d => d._children ? -6 : 6)
            .attr("text-anchor", d => d._children ? "end" : "start")
            .text(d => d.data.name)
            .clone(true).lower()
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .attr("stroke", "white");

        node.merge(nodeEnter).transition(transition)
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        node.exit().transition(transition).remove()
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        const link = gLink.selectAll("path")
            .data(links, d => d.target.id);

        const linkEnter = link.enter().append("path")
            .attr("d", d => {
                const o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            });

        link.merge(linkEnter).transition(transition)
            .attr("d", diagonal);

        link.exit().transition(transition).remove()
            .attr("d", d => {
                const o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            });

        root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    update(root);

    child.node();
};
