const _ = require('lodash');
const Promise = require('bluebird');
const warpjsUtils = require('@warp-works/warpjs-utils');

const errorTemplate = require('./../error.hbs');
const template = require('./../template.hbs');
const questionnaireTemplate = require('./questionnaire.hbs');
const questionnaireIntroTemplate = require('./questionnaire-intro.hbs');
const questionnairePrivacyTemplate = require('./questionnaire-privacy.hbs');
const questionnaireDescriptionTemplate = require('./questionnaire-description.hbs');
const questionnaireLevelsTemplate = require('./questionnaire-levels.hbs');
const questionnaireSolutionCanvasTemplate = require('./questionnaire-solution-canvas.hbs');
const questionnaireIterationTemplate = require('./questionnaire-iterations.hbs');
const questionnaireEndTemplate = require('./questionnaire-end.hbs');

(($) => $(document).ready(() => {
    const loader = warpjsUtils.toast.loading($, "Page is loading");
    const placeholder = $('#warpjs-content-placeholder');
    placeholder.html(template());

    function styleRadio() {
        $('input:radio').hide().each(function() {
            $(this).attr('data-radio-fx', this.name);
            var label = $("label[for=" + '"' + this.id + '"' + "]").text();
            $('<a ' + (label !== '' ? 'title=" ' + label + ' "' : '') + ' data-radio-fx="' + this.name + '" class="radio-fx" href="#">' +
                '<span class="radio' + (this.checked ? ' radio-checked' : '') + '"></span></a>').insertAfter(this);
        });
        $('a.radio-fx').on('click', function(event) {
            event.preventDefault();
            var unique = $(this).attr('data-radio-fx');
            $("a[data-radio-fx='" + unique + "'] span").removeClass('radio-checked');
            $(":radio[data-radio-fx='" + unique + "']").attr('checked', false);
            $(this).find('span').addClass('radio-checked');
            $(this).prev('input:radio').attr('checked', true);
        });
    }

    return warpjsUtils.getCurrentPageHAL($)
        .then((result) => {
            let categoryPointer = 0;
            let iterationPointer = 0;
            let questionPointer = 0;
            let progress = 0;
            let categories = result.data._embedded.answers[0]._embedded.categories;
            const progressTotal = categories.length + 5;

            warpjsUtils.toast.close($, loader);
            if (result.error) {
                placeholder.html(errorTemplate(result.data));
            } else {
                return Promise.resolve()
                    .then(() => questionnaireIntroTemplate())
                    .then((content) => $('.ipt-body').html(content))
                    .then(() => warpjsUtils.documentReady($))
                    .then(() => {
                        $(document).on('click', '.intro-next', (event) => {
                            event.preventDefault();
                            $('.ipt-body').html(questionnairePrivacyTemplate());
                            progress = 1 / progressTotal * 100;
                            $('.ipt .progress-bar').css('width', progress + '%');
                        });
                        $(document).on('click', '.privacy-next', (event) => {
                            event.preventDefault();
                            $('.ipt-body').html(questionnaireDescriptionTemplate());
                            progress = 2 / progressTotal * 100;
                            $('.ipt .progress-bar').css('width', progress + '%');
                        });
                        $(document).on('click', '.description-next', (event) => {
                            event.preventDefault();
                            // const url = result.data._links.self.href;
                            // const data = {
                            //     projectName: $('#project-name').val(),
                            //     mainContact: $('#main-contact').val(),
                            //     projectStatus: $('#project-status').val()
                            // };

                            result.data.projectName = $('#project-name').val();
                            result.data.mainContact = $('#main-contact').val();
                            result.data.projectStatus = $('#project-status').val();

                            // Promise.resolve()
                            //     .then(() => warpjsUtils.proxy.patch($, url, data))
                            //     .then((update) => {
                            //       console.log('update:: ', update);
                            // })

                            $('.ipt-body').html(questionnaireLevelsTemplate());
                            progress = 3 / progressTotal * 100;
                            $('.ipt .progress-bar').css('width', progress + '%');

                            styleRadio();
                        });

                        $(document).on('click', '.levels-next', (event) => {
                            event.preventDefault();
                            result.data.detailLevel = $("input[name='questionnaire-level'][checked='checked']").val();
                            $('.ipt-body').html(questionnaireSolutionCanvasTemplate());
                            progress = 4 / progressTotal * 100;
                            $('.ipt .progress-bar').css('width', progress + '%');
                        });

                        $(document).on('click', '.solution-canvas-next', (event) => {
                            event.preventDefault();

                            categories = result.data._embedded.answers[0]._embedded.categories;
                            let iterations = _.filter(categories[categoryPointer]._embedded.iterations, function(iteration) {
                                return categories[categoryPointer].isRepeatable ? iteration.name !== '' : true;
                            });
                            let questions = iterations.length > 0 ? _.filter(iterations[iterationPointer]._embedded.questions, function(question) {
                                return question.detailLevel <= result.data.detailLevel;
                            }) : [];
                            progress = 5 / progressTotal * 100;
                            $('.ipt .progress-bar').css('width', progress + '%');

                            console.log('data: ', result.data);
                            console.log('iterations: ', iterations, 'categories', categories, 'questions', questions);

                            function updatePointers(direction) {
                                categories = result.data._embedded.answers[0]._embedded.categories;
                                iterations = _.filter(categories[categoryPointer]._embedded.iterations, function(iteration) {
                                    return categories[categoryPointer].isRepeatable ? iteration.name !== '' : true;
                                });
                                questions = iterations.length > 0 ? _.filter(iterations[iterationPointer]._embedded.questions, function(question) {
                                    return question.detailLevel <= result.data.detailLevel;
                                }) : [];
                                console.log('iterations: ', iterations, 'categories', categories, 'questions', questions);
                                let outOfBounds = '';
                                console.log('categories[categoryPointer].length:', categoryPointer, result.data._embedded.answers[0]._embedded.categories.length);
                                if (direction === 'next') {
                                    console.log('check questions length', questionPointer + 1, questions.length);
                                    if (questionPointer + 1 >= questions.length) {
                                        console.log('check iterations length', iterationPointer + 1, iterations.length);
                                        if (iterationPointer + 1 >= iterations.length) {
                                            console.log('check categories length', categoryPointer + 1, categories.length);
                                            console.log('categories', categories);
                                            if (categoryPointer + 1 >= categories.length) {
                                                outOfBounds = 'end';
                                            } else {
                                                categoryPointer += 1;
                                                iterationPointer = 0;
                                                questionPointer = 0;

                                                iterations = _.filter(categories[categoryPointer]._embedded.iterations, function(iteration) {
                                                    return categories[categoryPointer].isRepeatable ? iteration.name !== '' : true;
                                                });

                                                questions = iterations.length > 0 ? _.filter(iterations[iterationPointer]._embedded.questions, function(question) {
                                                    return question.detailLevel <= result.data.detailLevel;
                                                }) : [];
                                                console.log('got to next category', categories[categoryPointer].isRepeatable);
                                                if (categories[categoryPointer].isRepeatable === true) {
                                                    questionPointer = -1;
                                                }
                                            }
                                        } else {
                                            iterationPointer += 1;
                                            questionPointer = 0;

                                            questions = _.filter(iterations[iterationPointer]._embedded.questions, function(question) {
                                                return question.detailLevel <= result.data.detailLevel;
                                            });
                                        }
                                    } else {
                                        questionPointer += 1;
                                    }
                                } else if (direction === 'back') {
                                    if ((categories[categoryPointer].isRepeatable === true && iterationPointer === 0 && questionPointer - 1 < -1) || (categories[categoryPointer].isRepeatable === true && iterationPointer > 0 && questionPointer - 1 < 0) || (categories[categoryPointer].isRepeatable === false && questionPointer - 1 < 0)) {
                                        if (iterationPointer - 1 < 0) {
                                            if (categoryPointer - 1 < 0) {
                                                outOfBounds = 'front';
                                            } else {
                                                categoryPointer -= 1;
                                                iterations = _.filter(categories[categoryPointer]._embedded.iterations, function(iteration) {
                                                    return categories[categoryPointer].isRepeatable ? iteration.name !== '' : true;
                                                });
                                                questions = iterations.length > 0 ? _.filter(iterations[iterationPointer]._embedded.questions, function(question) {
                                                    return question.detailLevel <= result.data.detailLevel;
                                                }) : [];
                                                iterationPointer = iterations.length === 0 ? 0 : iterations.length - 1;
                                                questionPointer = questions.length - 1;
                                            }
                                        } else {
                                            iterationPointer -= 1;
                                            questionPointer = questions.length - 1;
                                        }
                                    } else {
                                        questionPointer -= 1;
                                    }
                                }

                                console.log('categoryPointer', categoryPointer, 'iterationPointer', iterationPointer, 'questionPointer', questionPointer);
                                updateQuestionContent(outOfBounds);
                            }

                            function assignOptionSelected(qQuestion, aQuestion) {
                                if (typeof qQuestion !== 'undefined' && typeof aQuestion !== 'undefined') {
                                    let option = _.find(qQuestion._embedded.options, (option) => {
                                        console.log('check: ', option.position, aQuestion.answer, option.position === aQuestion.answer, result.data);
                                        return option.position === aQuestion.answer;
                                    });
                                    if (typeof option !== 'undefined') {
                                        option.isSelected = true;
                                    }
                                }
                                return qQuestion;
                            }

                            function updateQuestionContent(outOfBounds = '') {
                                progress = (categoryPointer + 5) / progressTotal * 100;
                                console.log('updateQuestionContent question pointer: ', questionPointer);
                                if (outOfBounds !== '') {
                                    if (outOfBounds === 'front') {
                                        progress = 4 / progressTotal * 100;
                                        $('.ipt-body').html(questionnaireSolutionCanvasTemplate());
                                    } else if (outOfBounds === 'end') {
                                        progress = progressTotal / progressTotal * 100;
                                        $('.ipt-body').html(questionnaireEndTemplate());
                                    }
                                } else if (questionPointer === -1) {
                                    const currentCategory = _.find(result.data._embedded.questionnaires[0]._embedded.categories, (category) => {
                                        return category.id === categories[categoryPointer].id;
                                    });
                                    $('.ipt-body').html(questionnaireIterationTemplate({category: currentCategory, iterations: categories[categoryPointer]._embedded.iterations}));
                                } else {
                                    const currentCategory = _.find(result.data._embedded.questionnaires[0]._embedded.categories, (category) => {
                                        return category.id === categories[categoryPointer].id;
                                    });
                                    console.log('currentCategory', currentCategory);
                                    const currentQuestion = _.cloneDeep(_.find(currentCategory._embedded.questions, (question) => {
                                        console.log();
                                        return question.id === questions[questionPointer].id;
                                    }));

                                    const updatedQuestion = assignOptionSelected(currentQuestion, questions[questionPointer]);
                                    let templateValues = {category: currentCategory, question: updatedQuestion};
                                    if (iterations[iterationPointer].name !== '') {
                                        templateValues.iteration = iterations[iterationPointer];
                                    }
                                    $('.ipt-body').html(questionnaireTemplate(templateValues));
                                }

                                $('.ipt .progress-bar').css('width', progress + '%');
                                styleRadio();
                            }

                            function updateIterations() {
                                const category = result.data._embedded.answers[0]._embedded.categories[categoryPointer];
                                category._embedded.iterations[0].name = $('input#iteration1').val();
                                category._embedded.iterations[1].name = $('input#iteration2').val();
                                category._embedded.iterations[2].name = $('input#iteration3').val();
                                category._embedded.iterations[3].name = $('input#iteration4').val();
                                category._embedded.iterations[4].name = $('input#iteration5').val();
                                category._embedded.iterations[5].name = $('input#iteration6').val();
                            }

                            function updateQuestions() {
                                questions[questionPointer].answer = $("input[name='quesiton-options'][checked='checked']").val();
                            }

                            $(document).on('click', '.question-next', (event) => {
                                updateQuestions();
                                updatePointers('next');
                            });
                            $(document).on('click', '.question-back', (event) => {
                                updateQuestions();
                                updatePointers('back');
                            });
                            $(document).on('click', '.iteration-next', (event) => {
                                updateIterations();
                                updatePointers('next');
                            });
                            $(document).on('click', '.iteration-back', (event) => {
                                updateIterations();
                                updatePointers('back');
                            });

                            if (result.data._embedded.answers[0]._embedded.categories[categoryPointer].isRepeatable === true) {
                                questionPointer = -1;
                            }

                            updateQuestionContent();
                        });
                    })
                ;
            }
        })
    ;
}))(jQuery);
