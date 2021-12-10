import requests
import json
from types import SimpleNamespace
import threading
import random
import math
import py_trees

class Foo(py_trees.behaviour.Behaviour):
    def __init__(self, name):

        super(Foo, self).__init__(name)

    def setup(self):

        self.logger.debug("  %s [Foo::setup()]" % self.name)

    def initialise(self):

        self.logger.debug("  %s [Foo::initialise()]" % self.name)

    def update(self):
        self.logger.debug("  %s [Foo::update()]" % self.name)
        ready_to_make_a_decision = random.choice([True, False])
        decision = random.choice([True, False])
        if not ready_to_make_a_decision:
            return py_trees.common.Status.RUNNING
        elif decision:
            self.feedback_message = "We are not bar!"
            return py_trees.common.Status.SUCCESS
        else:
            self.feedback_message = "Uh oh"
            return py_trees.common.Status.FAILURE

    def terminate(self, new_status):
        self.logger.debug("  %s [Foo::terminate().terminate()][%s->%s]" % (self.name, self.status, new_status))

def bot():
    stanjeIgre = { "frame": 0, "traje": False }
    prosloStanje = { "frame": 0, "traje": False }
    response = requests.get("http://localhost:3000/stanjeterena")
    stanje = response.json()
    if stanje["traje"]:
        if stanje["frame"]>prosloStanje["frame"]:
            #ovo ispod se izvrsava svaki put kad se detektuje promena frejma, to je glavna logika bota
            tg = random.uniform(0, 1)*2-1
            requests.get("http://localhost:3000/zatrazipucanje?x="+str(tg)+"&y=-1")#random pucanje
            dx = math.floor(random.uniform(0, 1)*3-1)
            if dx==1:
                requests.get("http://localhost:3000/zelidesno")
            elif dx==-1:
                requests.get("http://localhost:3000/zelilevo")
            prosloStanje = stanjeIgre
    elif stanje["igrac"] and "mrtav" in stanje["igrac"]:
            requests.get("http://localhost:3000/novaigra")
    else:
        stanjeIgre = { "frame": 0, "traje": False }
        prosloStanje = { "frame": 0, "traje": False }
        requests.get("http://localhost:3000/zapocniigru")
    threading.Timer(1.0/120, bot).start() #salje se 120 puta u sekundi da bi uhvatio vise promena frejmova
  
bot()