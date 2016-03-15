from mongoengine.connection import get_db


def _config():
    return get_db().certuk_config


def save(name, value):
    _config().update({
        'name': name
    }, {
        '$setOnInsert': {
            'name': name,
        },
        '$set': {
            'value': value
        }
    }, True)


def get(name):
    return _config().find_one({
        'name': name
    }).get('value')


def get_all():
    return _config().find({}, {
        '_id': 0
    })
