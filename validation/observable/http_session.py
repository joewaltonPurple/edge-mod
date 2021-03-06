
from adapters.certuk_mod.validation import ValidationStatus, FieldValidationInfo
from observable import ObservableValidationInfo
import re


class HTTPSessionValidationInfo(ObservableValidationInfo):

    TYPE = 'HTTPSessionObjectType'

    USER_AGENT_MATCHER = re.compile(r'.+/.+', re.IGNORECASE)

    def __init__(self, observable_data, **field_validation):
        super(HTTPSessionValidationInfo, self).__init__(HTTPSessionValidationInfo.TYPE, observable_data, **field_validation)
        self.user_agent = field_validation['user_agent']

    @classmethod
    def validate(cls, **observable_data):
        user_agent = observable_data.get('user_agent')
        user_agent_validation = None
        if not user_agent:
            user_agent_validation = FieldValidationInfo(ValidationStatus.ERROR, 'User Agent value is missing')
        elif not cls.USER_AGENT_MATCHER.match(user_agent):
            user_agent_validation = FieldValidationInfo(ValidationStatus.WARN, 'User Agent value may be invalid')

        return cls(observable_data, user_agent=user_agent_validation)
