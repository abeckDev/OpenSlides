from unittest import TestCase
from unittest.mock import MagicMock, patch

from openslides.core import views
from openslides.utils.rest_api import ValidationError


class TestUrlPatternsView(TestCase):
    @patch('openslides.core.views.get_resolver')
    def test_get_context_data(self, mock_resolver):
        mock_resolver().reverse_dict = {
            'url_pattern1': ([['my_url1', [None]]], None, None),
            'url_pattern2': ([['my_url2/%(kwarg)s/', ['kwargs']]], None, None),
            ('not_a_str', ): [[['not_a_str']]]}
        view = views.UrlPatternsView()

        context = view.get_context_data()

        self.assertEqual(
            context,
            {'url_pattern1': 'my_url1',
             'url_pattern2': 'my_url2/:kwarg/'})


@patch('openslides.core.views.ProjectorViewSet.get_object')
class ProjectorAPI(TestCase):
    def setUp(self):
        self.viewset = views.ProjectorViewSet()
        self.viewset.format_kwarg = None

    def test_activate_elements(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_Du4tie7foosahnoofahg',
            'test_key_Eek8eipeingulah3aech': 'test_value_quuupaephuY7eoLohbee'}]
        request = MagicMock()
        request.data = [{'name': 'new_test_projector_element_el9UbeeT9quucesoyusu'}]
        self.viewset.request = request
        self.viewset.activate_elements(request=request, pk=MagicMock())
        self.assertEqual(len(mock_object.return_value.config), 2)

    def test_activate_elements_no_list(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_ahshaiTie8xie3eeThu9',
            'test_key_ohwa7ooze2angoogieM9': 'test_value_raiL2ohsheij1seiqua5'}]
        request = MagicMock()
        request.data = {'name': 'new_test_projector_element_buuDohphahWeeR2eeQu0'}
        self.viewset.request = request
        with self.assertRaises(ValidationError):
            self.viewset.activate_elements(request=request, pk=MagicMock())

    def test_activate_elements_bad_element(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_ieroa7eu3aechaip3eeD',
            'test_key_mie3Eeroh9rooKeinga6': 'test_value_gee1Uitae6aithaiphoo'}]
        request = MagicMock()
        request.data = [{'bad_quangah1ahoo6oKaeBai': 'value_doh8ahwe0Zooc1eefu0o'}]
        self.viewset.request = request
        with self.assertRaises(ValidationError):
            self.viewset.activate_elements(request=request, pk=MagicMock())

    def test_prune_elements(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_Oc7OhXeeg0poThoh8boo',
            'test_key_ahNei1ke4uCio6uareef': 'test_value_xieSh4yeemaen9oot6ki'}]
        request = MagicMock()
        request.data = [{
            'name': 'test_projector_element_bohb1phiebah5TeCei1N',
            'test_key_gahSh9otu6aeghaiquie': 'test_value_aeNgee2Yeeph4Ohru2Oo'}]
        self.viewset.request = request
        self.viewset.prune_elements(request=request, pk=MagicMock())
        self.assertEqual(len(mock_object.return_value.config), 1)

    def test_prune_elements_with_stable(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_aegh2aichee9nooWohRu',
            'test_key_wahlaelahwaeNg6fooH7': 'test_value_taePie9Ohxohja4ugisa',
            'stable': True}]
        request = MagicMock()
        request.data = [{
            'name': 'test_projector_element_yei1Aim6Aed1po8eegh2',
            'test_key_mud1shoo8moh6eiXoong': 'test_value_shugieJier6agh1Ehie3'}]
        self.viewset.request = request
        self.viewset.prune_elements(request=request, pk=MagicMock())
        self.assertEqual(len(mock_object.return_value.config), 2)

    def test_deactivate_elements(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_c6oohooxugiphuuM6Wee',
            'test_key_eehiloh7mibi7ur1UoB1': 'test_value_o8eig1AeSajieTh6aiwo'}]
        request = MagicMock()
        request.data = [{
            'name': 'test_projector_element_c6oohooxugiphuuM6Wee',
            'test_key_eehiloh7mibi7ur1UoB1': 'test_value_o8eig1AeSajieTh6aiwo'}]
        self.viewset.request = request
        self.viewset.deactivate_elements(request=request, pk=MagicMock())
        self.assertEqual(len(mock_object.return_value.config), 0)

    def test_deactivate_elements_wrong_element(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_c6oohooxugiphuuM6Wee',
            'test_key_eehiloh7mibi7ur1UoB1': 'test_value_o8eig1AeSajieTh6aiwo'}]
        request = MagicMock()
        request.data = [{'name': 'wrong name'}]
        self.viewset.request = request
        self.viewset.deactivate_elements(request=request, pk=MagicMock())
        self.assertEqual(len(mock_object.return_value.config), 1)

    def test_deactivate_elements_no_list(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_Au1ce9nevaeX7zo4ye2w',
            'test_key_we9biiZ7bah4Sha2haS5': 'test_value_eehoipheik6aiNgeegor'}]
        request = MagicMock()
        request.data = 'bad_value_no_list_ohchohWee1fie0SieTha'
        self.viewset.request = request
        with self.assertRaises(ValidationError):
            self.viewset.deactivate_elements(request=request, pk=MagicMock())

    def test_deactivate_elements_bad_list(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_teibaeRaim1heiCh6Ohv',
            'test_key_uk7wai7eiZieQu0ief3': 'test_value_eeghisei3ieGh3ieb6ae'}]
        request = MagicMock()
        # Value 1 is not an dictionary so we expect ValidationError.
        request.data = [1]
        self.viewset.request = request
        with self.assertRaises(ValidationError):
            self.viewset.deactivate_elements(request=request, pk=MagicMock())

    def test_clear_elements(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_iphuuM6Weec6oohooxug',
            'test_key_bi7ur1UoB1eehiloh7mi': 'test_value_jieTh6aiwoo8eig1AeSa'}]
        request = MagicMock()
        self.viewset.request = request
        self.viewset.clear_elements(request=request, pk=MagicMock())
        self.assertEqual(len(mock_object.return_value.config), 0)

    def test_clear_elements_with_stable(self, mock_object):
        mock_object.return_value.config = [{
            'name': 'test_projector_element_6oohooxugiphuuM6Weec',
            'test_key_bi7B1eehiloh7miur1Uo': 'test_value_jiSaeTh6aiwoo8eig1Ae',
            'stable': True}]
        request = MagicMock()
        self.viewset.request = request
        self.viewset.clear_elements(request=request, pk=MagicMock())
        self.assertEqual(len(mock_object.return_value.config), 1)
