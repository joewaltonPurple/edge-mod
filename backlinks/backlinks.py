import os
from time import sleep

from pymongo.errors import OperationFailure
from django.conf import settings
from mongoengine.connection import get_db
from edge.tools import StopWatch
from adapters.certuk_mod.common.activity import save as log_activity
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'repository.settings')
if not hasattr(settings, 'BASE_DIR'): raise Exception('could not load settings.py')


class STIXBacklinks(object):
    PAGE_SIZE = 600

    def __init__(self):
        pass

    def run(self):
        previous_failures = set()

        def _process_bulk_op():
            for blo in dict_bls.keys():
                c = db.stix_backlinks_mod.find_one({'_id': blo})
                existing_bls = {}
                if c:
                    existing_bls = c['value']

                for new_bl in dict_bls[blo]:
                    existing_bls[new_bl['id']] = new_bl['type']

                try:
                    db.stix_backlinks_mod.update({'_id': blo}, {'$set': {'value': existing_bls}}, upsert=True)
                except Exception as e:
                    if blo not in previous_failures:
                        log_activity("system", "Backlink", "ERROR", "processing %s length of backlinks: %d error %s)" % (blo, len(existing_bls), e.message))
                        previous_failures.add(blo)

        db = get_db()

        db.stix_backlinks_mod.update({"_id": "max_created_on"}, {'value': datetime.now()}, True)
        db.stix_backlinks.update({"_id": "max_created_on"}, {'value': datetime.now() + timedelta(days=5)}, True) #Make sure the bg process doesn't continue

        update_timer = StopWatch()

        dict_bls = {}
        for doc in db.stix.find({}):

            if 'data' in doc and 'edges' in doc['data']:
                for edge in doc['data']['edges'].keys():
                    dict_bls.setdefault(edge, []).append({"id": doc['_id'], "type": doc['type']})

            if not (len(dict_bls) % STIXBacklinks.PAGE_SIZE):
                _process_bulk_op()
                dict_bls = {}

        if len(dict_bls):
            _process_bulk_op()


        for i in range(0, 5):  # In case something adds to stix_backlinks between the drop and rename, try a few times
            db.stix_backlinks.drop()
            try:
                db.stix_backlinks_mod.rename("stix_backlinks")
            except OperationFailure:
                sleep(0.2)
                continue
            else:
                break

        log_activity("system", 'Backlink', 'INFO',
                     "%s : Updated for %d objects in %ds" %
                     (
                         'Full Rebuild',
                         db.stix.count(),
                         update_timer.sec())
                     )


if __name__ == '__main__':
    STIXBacklinks().run()
