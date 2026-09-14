import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('travel_csv', Path(__file__).parents[1] / 'scripts/import-travel-csv.py')
travel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(travel)


class TravelImportTests(unittest.TestCase):
    def test_timezone_and_timestamp_units_match(self):
        expected = travel.timestamp('2024-02-28T00:00:00Z')
        self.assertEqual(expected, travel.timestamp('2024-02-28 08:00:00'))
        self.assertEqual(expected, travel.timestamp(str(expected * 1000)))

    def test_missing_track_is_not_connected(self):
        points = [(0, 30, 120), (10, 30.001, 120), (7200, 31, 121), (7210, 31.001, 121)]
        self.assertEqual(travel.split_points(points), [[[30, 120], [30.001, 120]], [[31, 121], [31.001, 121]]])

    def test_export_order_duplicates_and_ambiguous_columns(self):
        points = [(20, 30.002, 120), (0, 30, 120), (10, 30, 120)]
        self.assertEqual(travel.split_points(points), [[[30, 120], [30.002, 120]]])
        self.assertEqual(travel.column(['纬度', '经度', '时间'], None, 'lng'), '经度')
        self.assertEqual(travel.column(['dataTime', 'longitude', 'latitude'], None, 'time'), 'dataTime')
        with self.assertRaises(ValueError):
            travel.column(['lat', 'latitude'], None, 'lat')


if __name__ == '__main__':
    unittest.main()
