(function($){
    var _connected = false;

    var letUserChoose = function (_message) {
        var message = unserialize(_message);
        var menus = {};

        function execService(service) {
            return function() {
                var choice = new sally.SallyFrameChoice;
                choice.choiceId = service.id;
                choice.callbackToken = message.callbackToken;
                choice.fileName = message.fileName;
                $.cometd.publish("/service/theo/choice", serialize(choice));
            }
        }

        for (var i=0; i<message.frames.length; i++) {
            var frame = message.frames[i];
            var frameName = frame.frameName; 
            menus[frameName] = {};
            for (var j=0; j<frame.frameServices.length; ++j) {
                var service = frame.frameServices[j];
                var servFun = execService(service);
                menus[frameName][service.name] = servFun;
            }
        }

        JOBAD.UI.ContextMenu.enable($("#wheel"), function() {
            return menus;
        }, {});
        setTimeout(function() {
            $("#wheel").trigger("contextmenu.JOBAD.UI.ContextMenu");
        }, 100);
    }


    var newWindow = function(fileName) {
        return function (_message) {
            var message = unserialize(_message);
            var frame = $("<iframe>").attr("src", message.url).attr("style", "width: 100%; height: 100%;");
            var divStyle = $("<div>").attr("style", "width: 100%; height: 100%;").append(frame);
            $(divStyle).dialog({
                title: message.title,
                position: {
                    "using" : function() {
                        $(this).css("top", message.position.y).css("left", message.position.x); 
                    }
                },
//                width: message.sizeX,
//                height: message.sizeY,
                width: 450,
                height: 330,
                close: function() {
                    $(divStyle).empty();
                }
            });
        };
    };

    // Function invoked when first contacting the server and
    // when the server has lost the state of this client
    function _handshakeWrapper(doc, JOBADInstance) {
        return function _metaHandshake(handshake) {
            if (handshake.successful === true) {
                $.cometd.batch(function () {
                    $.cometd.subscribe('/theo/letuserchoose', letUserChoose);
                    $.cometd.subscribe('/theo/newWindow', newWindow(doc));

                    var whoami = new sally.WhoAmI;
                    whoami.clientType = sally.WhoAmI.ClientType.Alex;
                    whoami.environmentType = sally.WhoAmI.EnvironmentType.Web;
                    whoami.documentType = sally.WhoAmI.DocType.Sketch;
                    $.cometd.publish('/service/theo/register', serialize(whoami));
        
                    JOBADInstance.Event.trigger("sally_connect", {"doc": doc, "instance": JOBADInstance});
                 });
            }
        }
    }

    function initCometD(url, doc, JOBADInstance) {
        return function() {
            var cometURL = url+"cometd";
            $.cometd.configure({ url: cometURL, logLevel: 'info' });

            $.cometd.addListener('/meta/handshake', _handshakeWrapper(doc, JOBADInstance));

            $.cometd.handshake();
        }
    }

    JOBAD.modules.register({
        info:{
            'identifier':   'sally.module',
            'title':    'Semantic Ally Module',
            'author':   'Constantin Jucovschi',
            'description':  'A generic module enabling connection with Semantic Alliance Framework.',
            'hasCleanNamespace': true,
        },        
        init: function(JOBADInstance, url, doc){
            JOBAD.util.loadExternalJS(url+"sally/alex_boot.js", initCometD(url, doc, JOBADInstance));
        },
    });
})(JOBAD.refs.$);