$(function() {
    var cardTemplate;
    var addTemplate;
    var boardId = 'WLCM';
    var cardList = [{
        title: 'Basics',
        cardPosition: 1,
        tasks: [{
            taskTitle: 'Welcome to Trello',
            taskPosition: 1
        }, {
            taskTitle: 'This is card',
            taskPosition: 2
        }, {
            taskTitle: 'Click on a card to see what\'s behind it',
            taskPosition: 3,
            extraAttribute: {
                commentCount: 4
            },
        }, {
            imageSrc: 'taco.png',
            taskTitle: 'You can attach pictures and files',
            taskPosition: 4,
            extraAttribute: {
                attachCount: 1
            },
        }, ]
    }, {
        title: 'Intermediate',
        cardPosition: 2,
        tasks: [{
            taskTitle: 'Invite your team to this board byusing the add Members button',
            taskPosition: 1
        }, {
            taskTitle: 'Drag people onto a card to indicate that they are responsible for it.',
            taskPosition: 2
        }, {
            taskTitle: 'Make as many lists you need!',
            taskPosition: 3,
            extraAttribute: {}
        }, ]
    }]
    renderInitialHTML(cardList);

    function renderInitialHTML(cardDataList) {
        cardTemplate = Handlebars.compile($("#cardListTemplate").html()); // Compile the template
        addTemplate = Handlebars.compile($("#add-card").html());
        Handlebars.registerPartial("task", $("#task-template").html());
        Handlebars.registerPartial("cardHead", $("#cardHeadTemplate").html());
        $(".cardBoard").append(addTemplate);
        $("#addButton").click(addCard); // add button template
        for (var i = 0; i < cardDataList.length; i++) {
            addCardHTML(cardDataList[i]);
        }
        enableDragAndDrop();
    }

    function enableDragAndDrop() {
        $(".cardContainer").sortable({
            items: ".task",
            connectWith: ".cardContainer",
            start: moveTaskStart,
            receive: moveTaskEnd, // for inter card movement
            update: function(e, ui) {
                if (this === ui.item.parent()[0] && ui.sender === null) //for intra card movement
                    moveTaskEnd(e, ui);
            },
        }).disableSelection();
        $(".cardBoard").sortable({
            update: moveCard
        }).disableSelection();
    }

    function moveCard(event, ui) {
        var cardDom = ui.item;
        var initialPosition = parseInt(cardDom.attr('seqno'));
        var prevElem = ui.item.prev();
        var finalPosition;
        if (prevElem.length > 0)
            finalPosition = parseInt(prevElem.attr('seqno')) + 1;
        else
            finalPosition = 1;
        moveElement(initialPosition, finalPosition, cardList);
        for (var i = 0; i < cardList.length; i++) {
            cardList[i].cardPosition = i + 1;
        }
        $(".cardContainer").each(function(key, obj) {
            obj.setAttribute('seqno', key + 1);
        });

        var serverCallObj = {
        	action: 'CM',
        	initialPosition:initialPosition,
        	finalPosition:finalPosition,
			boardId:boardId        	
        }
        console.log("server call object is: "+ serverCallObj);
    }

    function moveElement(origPosition, finalPosition, container) {
        if (origPosition < finalPosition)
            finalPosition = finalPosition - 1;
        var dataElem = container.splice(origPosition - 1, 1)[0];
        container.splice(finalPosition - 1, 0, dataElem);
    }

    function addCard() {
        var titleStr = $(this.parentElement).find('input').val();
        var cardObj = {
            title: titleStr,
            cardPosition: cardList.length + 1
        };
        addCardHTML(cardObj);
        cardList.push(cardObj);

        var serverCallObj = {
        	action: 'CA',
        	title:titleStr,
			boardId:boardId        	
        }
        console.log("server call object is: "+ serverCallObj);
        $(this.parentElement).find('input').val("");
    }

    function addCardHTML(cardData) {
        var cardDom = jQuery.parseHTML(cardTemplate(cardData));
        $(cardDom).find("#addTask").click(addTask);
        $(cardDom).insertBefore(".addCard");
    }

    function addTask() { // TODO: update task count rendering
        var titleStr = $(this.parentElement).find('input').val();
        var cardNumber = parseInt(this.parentElement.parentElement.getAttribute('seqno'));
        var cardModel = cardList[cardNumber - 1];
        var taskObj = {
            taskTitle: titleStr,
            taskPosition: cardModel.tasks.length + 1
        };
        var taskHtmlStr = Handlebars.partials['task'](taskObj);
        
        $(".cardContainer").sortable({
            items: ".task",
            connectWith: ".cardContainer"
        }).disableSelection();
        cardModel.tasks.push(taskObj);
        var cardheadHtml = Handlebars.partials['cardHead'](cardModel);
		$(this.parentElement.parentElement).find(".cardHeader").replaceWith(cardheadHtml);
        $(taskHtmlStr).insertBefore(this.parentElement);
        var serverCallObj = {
        	action: 'TA',
        	title:titleStr,
        	cardNum:cardNumber,
			boardId:boardId        	
        }
        console.log("server call object is: "+ serverCallObj);
        $(this.parentElement).find('input').val("");
    }
    var taskStartCardNum;

    function moveTaskStart(event, ui) {
        var taskDom = ui.item;
        taskStartCardNum = parseInt(taskDom.parent().attr('seqno'));
    }

    function moveTaskEnd(event, ui) {
        var taskDom = ui.item;
        var initialPosition = parseInt(taskDom.attr('seqno'));
        var taskEndCardNum = parseInt(taskDom.parent().attr('seqno'));
        var prevElem = ui.item.prev();
        var finalPosition;
        if (prevElem.length > 0)
            finalPosition = parseInt(prevElem.attr('seqno')) + 1;
        else
            finalPosition = 1;
        moveTaskData(initialPosition, taskStartCardNum, finalPosition, taskEndCardNum, cardList);

        var cardContainerDomArray = $(".cardContainer");

        $(cardContainerDomArray[taskStartCardNum - 1]).find(".task").each(setSeqNoAttr);
        if (taskStartCardNum != taskEndCardNum){
            $(cardContainerDomArray[taskEndCardNum - 1]).find(".task").each(setSeqNoAttr);

            var recipientHeaderhtml = Handlebars.partials['cardHead'](cardList[taskEndCardNum - 1]);
            var senderHeaderhtml = Handlebars.partials['cardHead'](cardList[taskStartCardNum - 1]);
            $(cardContainerDomArray[taskEndCardNum - 1]).find(".cardHeader").replaceWith(recipientHeaderhtml);
			$(cardContainerDomArray[taskStartCardNum - 1]).find(".cardHeader").replaceWith(senderHeaderhtml);
        }


        var serverCallObj = {
        	action: 'TM',
        	taskStartNum:initialPosition,
        	taskEndPosition:finalPosition,
        	taskStartCardNum:taskStartCardNum,
        	taskEndCardNum:taskEndCardNum,
			boardId:boardId        	
        }
        console.log("server call object is: "+ serverCallObj);
    }

    function moveTaskData(taskStartPosition, taskStartCardNum, taskEndPosition, taskEndCardNum, cardList) {
        var dataElem = cardList[taskStartCardNum - 1].tasks[taskStartPosition - 1];
        if (taskStartCardNum != taskEndCardNum) {
            cardList[taskStartCardNum - 1].tasks.splice(taskStartPosition - 1, 1)
            cardList[taskEndCardNum - 1].tasks.splice(taskEndPosition - 1, 0, dataElem)
        } else {
            moveElement(taskStartPosition, taskEndPosition, cardList[taskStartCardNum - 1].tasks);
        }

        var taskList = cardList[taskStartCardNum - 1].tasks;
        for (var i = 0; i < taskList.length; i++) {
            taskList[i].taskPosition = i + 1;
        }
        if (taskStartCardNum != taskEndCardNum) {
            taskList = cardList[taskEndCardNum - 1].tasks
            for (var i = 0; i < taskList.length; i++) {
                taskList[i].taskPosition = i + 1;
            }
        }
    }

    function setSeqNoAttr(key, obj) {
        obj.setAttribute('seqno', key + 1);
    }
});