const http = require('http')

let saljiget = function (putanja, opcije, cb) {
    if (!putanja) putanja = "/";
    if (!opcije) opcije = {};
    if (!cb) cb = () => { };
    let vred = "?";
    for (let i in opcije) {
        vred += i + "=" + opcije[i] + "&";
    }
    vred.slice(0, -1);
    let opcijezahteva = {
        hostname: '192.168.1.12',
        port: 3000,
        path: putanja + vred,
        method: 'GET'
    }
    let req = http.request(opcijezahteva, res => {
        res.on('data', d => {
            try {
                let podaci = JSON.parse(d);
                cb(podaci);
            }
            catch (e) {
                cb(false);
            }
        })
    })

    req.on('error', error => {
        console.error(error)
    })

    req.end()
}
const Status = {
    SUCCESS: 1,
    FAILURE: -1,
    RUNNING: 0
}

class Node {
    constructor(parent) {
        this.parent = parent ? parent : null;
    }
    tick() {

    }
}
class ControlFlowNode extends Node {
    constructor(parent, children) {
        super(parent ? parent : null);
        this.children = children ? children : [];
    }
    addChild(child) {
        this.children.push(child);
        child.parent = this;
    }
    addChildren(children) {
        for (let i in children) {
            this.children.push(children[i]);
            children[i].parent = this;
        }
    }
}
class SequenceNode extends ControlFlowNode {
    constructor(parent, children) {
        super(parent, children);
    }
    tick(data) {
        for (let i in this.children) {
            let result = this.children[i].tick(data);
            if (result == Status.SUCCESS) {

            }
            else if (result == Status.RUNNING) {
                return Status.RUNNING;
                //Ovde vrv treba da vrati RUNNING
            }
            else if (result == Status.FAILURE) {
                return Status.FAILURE;
            }
        }
        return Status.SUCCESS;
    }

}
class FallbackNode extends ControlFlowNode {
    constructor(parent, children) {
        super(parent, children);
    }
    tick(data) {
        for (let i in this.children) {
            let result = this.children[i].tick(data);
            if (result == Status.SUCCESS) {
                return Status.SUCCESS;
            }
            else if (result == Status.RUNNING) {
                return Status.RUNNING;
                //Ovde vrv treba da vrati RUNNING
            }
            else if (result == Status.FAILURE) {

            }
        }
        return Status.FAILURE;
    }
}
class DecoratorNode extends ControlFlowNode {
    constructor(decoratorFunction, parent, children) {
        super(parent, children);
        this.decoratorFunction = decoratorFunction;
    }
    tick(data) {
        let childrentickarray = [];
        for (let i in this.children) {
            let result = this.children[i].tick(data);
            childrentickarray.push(result);
        }
        return this.decoratorFunction(childrentickarray)
    }
}
class ParallelNode extends ControlFlowNode {
    constructor(parent, children) {
        super(parent, children);
    }
    tick(data) {
        let status = Status.FAILURE;
        for (let i in this.children) {
            let result = this.children[i].tick(data);
            if (result == Status.SUCCESS) {
                status = Math.min(Status.SUCCESS, status)
            }
            else if (result == Status.RUNNING) {
                status = Math.min(Status.RUNNING, status)
            }
            else if (result == Status.FAILURE) {
                status = Math.min(Status.FAILURE, status)
            }
        }
        return status;
    }
}
class ExecutionNode extends Node {
    constructor(parent) {
        super(parent ? parent : null);
    }
}
class ActionNode extends ExecutionNode {
    constructor(action, parent) {
        super(parent ? parent : null);
        this.action = action;
    }
    tick(data) {
        return this.action(data);//VRV SAMO VRACA RUNNING
    }
}
class ConditionNode extends ExecutionNode {
    constructor(condition, parent) {
        super(parent ? parent : null);
        this.condition = condition;
    }
    tick(data) {
        return this.condition(data);
    }
}
//DINAMICKE AKCIJE, KAD SE JEDNOM URADI, DA SE NE RADI PONOVO, hesmapa lako resenje, blackboard takodje, cuva samo relevantne informacije. data je blackboard

//root = new FallbackNode();

let root = new SequenceNode();
let novoStanjeCondition = new ConditionNode(function (podaci) {
    if (podaci.stanjeIgre.frame <= podaci.prosloStanje.frame) {
        return Status.FAILURE;
    }
    return Status.SUCCESS;
})
let mrtavProveraFallback = new FallbackNode();
let zivProveraCondition = new ConditionNode(function (podaci) {
    if (podaci.stanjeIgre.igrac?.mrtav) {
        return Status.FAILURE;
    }
    else {
        return Status.SUCCESS;
    }
});
let restartujAction = new ActionNode(function (podaci) {
    console.log("saljem novu igru" + podaci.stanjeIgre.frame);
    saljiget("/novaigra");
    return Status.RUNNING;
});
mrtavProveraFallback.addChildren([zivProveraCondition, restartujAction]);
let pauziranProveraFallback = new FallbackNode();
let trajeProveraCondition = new ConditionNode(function (podaci) {
    if (podaci.stanjeIgre.traje) {
        return Status.SUCCESS;
    }
    else {
        return Status.FAILURE;
    }
});
let odpauzirajAction = new ActionNode(function (podaci) {
    console.log("odpauziram" + podaci.stanjeIgre.frame);
    saljiget("/zapocniigru");
    return Status.RUNNING;
});
pauziranProveraFallback.addChildren([trajeProveraCondition, odpauzirajAction]);
let pucajIPomerajParallel = new ParallelNode();

let pucajRandomDesnoAction = new ActionNode(function (podaci) {
    saljiget("/zatrazipucanje", { x: Math.random(), y: -1 });
    return Status.RUNNING;
})
let pucanjeFallback = new FallbackNode();
let firstTrueInverterDecorator = new DecoratorNode(function (array) {
    //return array[0];
    return array[0] == Status.SUCCESS ? Status.FAILURE : array[0];
});
let proveraCiljanjaFallback = new FallbackNode();
let pucajRandomNeprijateljaAction = new ActionNode(function (podaci) {
    //nepx-igx/100
    let keys = Object.keys(podaci.stanjeIgre.neprijatelji);
    let nep = podaci.stanjeIgre.neprijatelji[keys[Math.floor(Math.random() * keys.length)]];
    let offset = Math.floor(Math.random() * 15) - 7;
    let broj = (nep.pozicija.x - podaci.stanjeIgre.igrac.pozicija.x + offset) / 100;
    //console.log(offset);
    //console.log((nep.pozicija.x - podaci.stanjeIgre.igrac.pozicija.x) / 100);
    console.log("trazim pucanje nerpijatelja");
    saljiget("/zatrazipucanje", { x: broj, y: -1 });
    return Status.RUNNING;
});
let postojiCiljaniMetakCondition = new ConditionNode(function (podaci) {
    let losimeci = [];
    for (let i in podaci.stanjeIgre.meci) {
        let metak = podaci.stanjeIgre.meci[i];
        if (metak.brzina.y < 0) continue;
        let mestoPada = metak.pozicija.x + metak.brzina.x * (100 - metak.pozicija.y) / metak.brzina.y;
        //console.log(mestoPada);
        if (mestoPada <= 5 && mestoPada >= -2) {
            losimeci.push(metak);
        }
    }
    if (losimeci.length > 0) {
        podaci.losmetak = losimeci[Math.floor(Math.random() * losimeci.length)];
        console.log(losimeci.length + "losih metkova");
        return Status.SUCCESS;
    }
    return Status.FAILURE;
});
proveraCiljanjaFallback.addChildren([postojiCiljaniMetakCondition, pucajRandomNeprijateljaAction]);
firstTrueInverterDecorator.addChildren([proveraCiljanjaFallback]);
console.log(firstTrueInverterDecorator.children);
let distanca = function (a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    let koren = Math.sqrt(dx * dx + dy * dy);
    return koren;
}
let skalproizvod = function (a, b) {
    return a.x * b.x + a.y * b.y;
}
let duzina = function (a) {
    return Math.sqrt(a.x * a.x + a.y * a.y);
}
let pucajLosMetakAction = new ActionNode(function (podaci) {
    //Ne moram da proveravam zato sto se ovo poziva samo kada los metak postoji
    let metak = podaci.losmetak;
    //console.log(metak.pozicija);
    //console.log(podaci.stanjeIgre.igrac.pozicija);
    let d = distanca(metak.pozicija, podaci.stanjeIgre.igrac.pozicija);
    let vektor = { x: metak.pozicija.x - podaci.stanjeIgre.igrac.pozicija.x, y: metak.pozicija.y - podaci.stanjeIgre.igrac.pozicija.y };
    let vremekolizije = d / (2 * Math.abs(skalproizvod(metak.brzina, vektor)) / (duzina(metak.brzina) * duzina(vektor))); //Mogao sam mozda da aproksimiram udaljenoscu, zato sto je kosinus skoro uvek 0
    let kolx = metak.pozicija.x + metak.brzina.x * vremekolizije;
    let koly = metak.pozicija.y + metak.brzina.y * vremekolizije;
    console.log("trazim pucanje metka");
    saljiget("/zatrazipucanje", { x: kolx - podaci.stanjeIgre.igrac.pozicija.x, y: koly - podaci.stanjeIgre.igrac.pozicija.y });
    /*console.log(metak.brzina);
    console.log(vektor);
    console.log("Skalpro: " + Math.abs(skalproizvod(metak.brzina, vektor)));
    console.log("proizvodduzina: " + (duzina(metak.brzina) * duzina(vektor)));
    console.log("Kosinus: " + Math.abs(skalproizvod(metak.brzina, vektor)) / (duzina(metak.brzina) * duzina(vektor)));
    console.log("dt: " + vremekolizije);*/
    return Status.RUNNING;
});
pucanjeFallback.addChildren([firstTrueInverterDecorator, pucajLosMetakAction]);
let pomeriDesnoAction = new ActionNode(function (podaci) {
    saljiget("/zelidesno");
    return Status.RUNNING;
})
let pomeriLevoAction = new ActionNode(function (podaci) {
    saljiget("/zelilevo");
    return Status.RUNNING;
})
pucajIPomerajParallel.addChildren([pucanjeFallback, pomeriLevoAction]);

root.addChildren([novoStanjeCondition, mrtavProveraFallback, pauziranProveraFallback, pucajIPomerajParallel]);
//console.log(root);

let prosloStanje = { frame: 0, traje: false };

setInterval(function () {
    saljiget("/stanjeterena", {}, function (stanjeIgre) {
        root.tick({ stanjeIgre: stanjeIgre, prosloStanje: prosloStanje })
        //console.log();
        prosloStanje = stanjeIgre;
    })

}, 1000 / 120);


/*saljiget("/stanjeterena", {}, function (stanjeIgre) {
    if (stanjeIgre.traje) {
        if (stanjeIgre.frame > prosloStanje.frame) {
            let x = Math.random() * 2 - 1
            saljiget("/zatrazipucanje", { x: x, y: -1 });
        }
        prosloStanje = stanjeIgre;
    }
    else if (stanjeIgre.igrac?.mrtav) {
        saljiget("/novaigra");
    }
    else {
        stanjeIgre = { frame: 0, traje: false };
        prosloStanje = { frame: 0, traje: false };
        novifrejm = 0;
        saljiget("/zapocniigru");
    }
})*/