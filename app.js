
const express = require('express')
const app = express()
const port = 3000
const http = require('http');
const server = http.createServer(app);
const path = require('path');

let idmetka = 0;
let idneprijatelja = 1;

let stanjeIgre = {
    frame: 0,
    skor: 0,
    traje: false,
    igrac: {
        zeliPucanje: false,
        zeliLevo: false,
        zeliDesno: false,
        ugaoPucanja: { x: 0, y: -1 },
        cooldown: 10,
        pozicija: {
            x: 50, y: 100
        }
        , poluprecnik: 3
    },
    meci: {},
    neprijatelji: {
        0: {
            cooldown: 0,
            pozicija: {
                x: 50, y: 3
            },
            poluprecnik: 3
        }
    }
}
let vektor_brzine = function (vektor) {
    let p = Math.sqrt(vektor.x * vektor.x + vektor.y * vektor.y);
    return {
        x: vektor.x / p,
        y: vektor.y / p
    }
}
app.get("/zatrazipucanje", (req, res) => {
    stanjeIgre.igrac.zeliPucanje = true;
    stanjeIgre.igrac.ugaoPucanja = vektor_brzine(req.query);
    /*if (stanjeIgre.igrac.cooldown > 10) {//jednom u pola skunde sme
        console.log(req.query);
        if (req.query.y < 0) {
            //let vek = vektor_brzine(req.query);
        }
    }*/
    res.status(200).send("a");
})
app.get("/zelilevo", (req, res) => {
    stanjeIgre.igrac.zeliLevo = true;
    stanjeIgre.igrac.zeliDesno = false;
    res.status(200).send("a");
})
app.get("/zelidesno", (req, res) => {
    stanjeIgre.igrac.zeliLevo = false;
    stanjeIgre.igrac.zeliDesno = true;
    res.status(200).send("a");
})
app.get("/novaigra", (req, res) => {
    console.log("restart");
    idmetka = 0;
    idneprijatelja = 1;
    stanjeIgre = {
        frame: 0,
        skor: 0,
        traje: false,
        igrac: {
            zeliPucanje: false,
            zeliLevo: false,
            zeliDesno: false,
            ugaoPucanja: { x: 0, y: -1 },
            cooldown: 10,
            pozicija: {
                x: 50, y: 100
            }
            , poluprecnik: 3
        },
        meci: {},
        neprijatelji: {
            0: {
                cooldown: 0,
                pozicija: {
                    x: 50, y: 3
                },
                poluprecnik: 3
            }
        }
    }
    res.status(200).send("a");
});
app.get("/zapocniigru", (req, res) => {
    if (!stanjeIgre.traje) {
        stanjeIgre.traje = true;
        console.log("zapoceo");
    }
    //Inicijalizacija svega
    res.status(200).send(JSON.stringify(stanjeIgre));
})
app.get("/pauzirajigru", (req, res) => {
    stanjeIgre.traje = false;
    //Inicijalizacija svega
    res.status(200).send(JSON.stringify(stanjeIgre));
})
app.get("/stanjeterena", (req, res) => {
    res.status(200).send(JSON.stringify(stanjeIgre));//Znamo sve o okruzenju, na hakatonu mozda ne bude tako
});
app.get('/', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, './index.html'));
})

app.listen(port, () => {

})

/*var io = require('socket.io')(server, {
    cors: {
        origin: "*"
    }
});*/

let dodir = function (a, b) {
    return Math.abs(a.pozicija.x - b.pozicija.x) < a.poluprecnik + b.poluprecnik && Math.abs(a.pozicija.y - b.pozicija.y) < a.poluprecnik + b.poluprecnik;
}

let update = function () {
    stanjeIgre.frame++;
    if (stanjeIgre.traje) {
        if (stanjeIgre.igrac.zeliLevo) {
            stanjeIgre.igrac.pozicija.x -= 2;
            if (stanjeIgre.igrac.pozicija.x < 0) {
                stanjeIgre.igrac.pozicija.x = 0;
            }
            stanjeIgre.igrac.zeliLevo = false;
        }
        else if (stanjeIgre.igrac.zeliDesno) {
            stanjeIgre.igrac.pozicija.x += 2;
            if (stanjeIgre.igrac.pozicija.x > 100) {
                stanjeIgre.igrac.pozicija.x = 100;
            }
            stanjeIgre.igrac.zeliDesno = false;
        }
        if (stanjeIgre.igrac.zeliPucanje && stanjeIgre.igrac.cooldown > 5) {
            stanjeIgre.meci[idmetka++] = { pozicija: { x: stanjeIgre.igrac.pozicija.x, y: stanjeIgre.igrac.pozicija.y }, poluprecnik: 1, brzina: { x: 1 * stanjeIgre.igrac.ugaoPucanja.x, y: 1 * stanjeIgre.igrac.ugaoPucanja.y } };
            stanjeIgre.igrac.cooldown = 0;
            stanjeIgre.igrac.zeliPucanje = false;
        }
        stanjeIgre.igrac.cooldown++;
        for (let i in stanjeIgre.meci) {
            let metak = stanjeIgre.meci[i];
            if (metak.pozicija.x < 0 || metak.pozicija.x > 100 || metak.pozicija.y < 0 || metak.pozicija.y > 100) {
                metak.mrtav = true;
            }
            else {
                metak.pozicija.x = metak.pozicija.x + metak.brzina.x;
                metak.pozicija.y = metak.pozicija.y + metak.brzina.y;
                for (let j in stanjeIgre.meci) {
                    let drugi = stanjeIgre.meci[j];
                    if (metak != drugi && metak.brzina.y * drugi.brzina.y < 0 && dodir(metak, drugi)) {
                        metak.mrtav = true;
                        drugi.mrtav = true;
                    }
                }
                for (let j in stanjeIgre.neprijatelji) {
                    let drugi = stanjeIgre.neprijatelji[j];
                    if (!metak.mrtav && !drugi.mrtav && metak != drugi && metak.brzina.y < 0 && dodir(metak, drugi)) {
                        metak.mrtav = true;
                        drugi.mrtav = true;
                    }
                }
                if (metak.brzina.y > 0 && !metak.mrtav && dodir(metak, stanjeIgre.igrac)) {
                    metak.mrtav = true;
                    stanjeIgre.igrac.mrtav = true;
                }
            }
        }

        for (let i in stanjeIgre.meci) {
            if (stanjeIgre.meci[i].mrtav) {
                delete stanjeIgre.meci[i];
            }
        }
        for (let i in stanjeIgre.neprijatelji) {
            if (stanjeIgre.neprijatelji[i].mrtav) {
                console.log("brisem nep");
                delete stanjeIgre.neprijatelji[i];
                stanjeIgre.skor++;
            }
        }
        if (stanjeIgre.igrac.mrtav) {
            console.log("UMRO");
            stanjeIgre.traje = false;
        }
        if (Object.keys(stanjeIgre.neprijatelji).length === 0
            && Object.getPrototypeOf(stanjeIgre.neprijatelji) === Object.prototype) {
            let brnep = 2 * idneprijatelja;
            while (idneprijatelja < brnep) {
                stanjeIgre.neprijatelji[idneprijatelja++] = {
                    cooldown: 0,
                    pozicija: {
                        x: Math.floor(Math.random() * 90) + 5, y: 3
                    },
                    poluprecnik: 3
                }
            }
        }
        else {
            for (let i in stanjeIgre.neprijatelji) {
                if (stanjeIgre.neprijatelji[i].cooldown > 50) {
                    let xp = Math.random() - 0.5;
                    let yp = Math.random();
                    let vek = vektor_brzine({ x: xp, y: yp });
                    stanjeIgre.meci[idmetka++] = { pozicija: { x: stanjeIgre.neprijatelji[i].pozicija.x, y: stanjeIgre.neprijatelji[i].pozicija.y }, poluprecnik: 1, brzina: { x: 1 * vek.x, y: 1 * vek.y } };
                    stanjeIgre.neprijatelji[i].cooldown = 0;
                }
                else {
                    let novx = stanjeIgre.neprijatelji[i].pozicija.x + Math.floor(Math.random() * 3) - 1;
                    if (novx < 99 && novx > 1) {
                        stanjeIgre.neprijatelji[i].pozicija.x = novx;
                    }
                }
                stanjeIgre.neprijatelji[i].cooldown++;
            }
        }
        //console.log("prosaofrejm");
    }
}
setInterval(function () {
    update();
}, 1000 / 60)//200 FPS


