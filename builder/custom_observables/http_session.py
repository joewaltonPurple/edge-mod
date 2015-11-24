
from cybox.objects.http_session_object import (
    HTTPRequestHeaderFields,
    HTTPRequestHeader,
    HTTPClientRequest,
    HTTPRequestResponse,
    HTTPSession
)
from edge.tools import rgetattr
from adapters.certuk_mod.builder.custom_observable_definition import CustomObservableDefinition


class HTTPSessionObservableDefinition(CustomObservableDefinition):

    def __init__(self):
        super(HTTPSessionObservableDefinition, self).__init__(
            object_type='HTTPSessionObjectType',
            human_readable_type='HTTP Session',
            can_batch_create=False,
            custom_id_prefix='http_session',
            builder_to_stix_object=HTTPSessionObservableDefinition.builder_to_stix_object,
            summary_value_generator=HTTPSessionObservableDefinition.summary_value_generator,
            to_draft_handler=HTTPSessionObservableDefinition.to_draft_handler
        )

    @staticmethod
    def builder_to_stix_object(object_data):
        fields = HTTPRequestHeaderFields()
        fields.user_agent = object_data.get('user_agent')

        header = HTTPRequestHeader()
        header.parsed_header = fields

        req = HTTPClientRequest()
        req.http_request_header = header

        req_res = HTTPRequestResponse()
        req_res.http_client_request = req

        session = HTTPSession()
        session.http_request_response = [req_res]

        return session

    @staticmethod
    def summary_value_generator(obj):
        http_request_response_list = rgetattr(obj, ['_object', 'properties', 'http_request_response'])
        value = rgetattr(http_request_response_list[0],
                        ['http_client_request', 'http_request_header', 'parsed_header', 'user_agent'], '(undefined)')
        return str(value)

    @staticmethod
    def to_draft_handler(observable, tg, load_by_id, id_ns=''):
        return {
            'objectType': 'HTTP Session',
            'id': rgetattr(observable, ['id_'], ''),
            'id_ns': id_ns,
            'title': rgetattr(observable, ['title'], ''),
            'description': str(rgetattr(observable, ['description'], '')),
            'user_agent': HTTPSessionObservableDefinition.summary_value_generator(observable)
        }
