"""Convert a selected WGS84 footprint CSV into a reviewable travel data file.

Raw exports stay local. Output defaults to .local-preview, not public site data.
Inspect the real export's columns/coordinate system before running this command.
"""
import argparse
import csv
import json
import math
from datetime import datetime, timezone, timedelta
from pathlib import Path

LOCAL_ZONE = timezone(timedelta(hours=8))
ALIASES = {
    'lat': ['latitude', 'lat', '纬度'],
    'lng': ['longitude', 'lng', 'lon', '经度'],
    'time': ['datatime', 'timestamp', 'time', 'datetime', 'date', '时间', '记录时间'],
}


def timestamp(value):
    value = value.strip()
    if not value:
        raise ValueError('时间为空')
    try:
        number = float(value)
    except ValueError:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00').replace('/', '-'))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=LOCAL_ZONE)
        return parsed.timestamp()
    return number / 1000 if abs(number) > 100_000_000_000 else number


def distance(a, b):
    lat1, lng1, lat2, lng2 = map(math.radians, (*a, *b))
    h = math.sin((lat2-lat1)/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin((lng2-lng1)/2)**2
    return 6_371_000 * 2 * math.asin(min(1, math.sqrt(h)))


def split_points(points, max_gap_seconds=3600, max_gap_meters=5000):
    segments, segment, previous = [], [], None
    for time, lat, lng in sorted(points):
        position = [round(lat, 6), round(lng, 6)]
        if previous and (time-previous[0] > max_gap_seconds or distance(previous[1:], position) > max_gap_meters):
            if len(segment) > 1:
                segments.append(segment)
            segment = []
        if not segment or segment[-1] != position:
            segment.append(position)
        previous = (time, *position)
    if len(segment) > 1:
        segments.append(segment)
    return segments


def column(headers, explicit, kind):
    if explicit:
        if explicit not in headers:
            raise ValueError(f'找不到列：{explicit}')
        return explicit
    candidates = [header for header in headers if header.strip().lower() in ALIASES[kind]]
    if len(candidates) != 1:
        raise ValueError(f'无法唯一识别 {kind} 列，请指定 --{kind}-column。表头：{headers}')
    return candidates[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv', type=Path)
    parser.add_argument('--title', required=True)
    parser.add_argument('--from-date', required=True, help='含起始时刻；不带时区时使用 UTC+8')
    parser.add_argument('--to-date', required=True, help='不含截止时刻；不带时区时使用 UTC+8')
    parser.add_argument('--crs', required=True, choices=['wgs84'], help='必须核实导出文件坐标系；不把 GCJ02 当成 WGS84')
    parser.add_argument('--lat-column')
    parser.add_argument('--lng-column')
    parser.add_argument('--time-column')
    parser.add_argument('--encoding', default='utf-8-sig')
    parser.add_argument('--max-gap-minutes', type=float, default=60)
    parser.add_argument('--max-gap-km', type=float, default=5)
    parser.add_argument('--max-accuracy-meters', type=float, help='忽略水平误差大于该值的点，需要 accuracy 列')
    parser.add_argument('--output', type=Path, default=Path('.local-preview/travel-import.json'))
    args = parser.parse_args()
    start, end = timestamp(args.from_date), timestamp(args.to_date)
    if start >= end or args.max_gap_minutes <= 0 or args.max_gap_km <= 0:
        parser.error('起止时间或断点阈值无效')
    points, rejected, low_accuracy = [], 0, 0
    with args.csv.open(encoding=args.encoding, newline='') as file:
        rows = csv.DictReader(file)
        headers = rows.fieldnames or []
        lat_key = column(headers, args.lat_column, 'lat')
        lng_key = column(headers, args.lng_column, 'lng')
        time_key = column(headers, args.time_column, 'time')
        if args.max_accuracy_meters is not None and (args.max_accuracy_meters <= 0 or 'accuracy' not in headers):
            parser.error('精度筛选需要正数阈值及 accuracy 列')
        for row in rows:
            try:
                time = timestamp(row[time_key])
                lat, lng = float(row[lat_key]), float(row[lng_key])
                if not math.isfinite(time) or not (-85.051129 <= lat <= 85.051129 and -180 <= lng <= 180):
                    raise ValueError('无效坐标或时间')
            except (ValueError, TypeError, AttributeError):
                rejected += 1
                continue
            if start <= time < end:
                if args.max_accuracy_meters is not None:
                    accuracy = float(row['accuracy'])
                    if not math.isfinite(accuracy) or accuracy < 0 or accuracy > args.max_accuracy_meters:
                        low_accuracy += 1
                        continue
                points.append((time, lat, lng))
    if rejected:
        raise ValueError(f'检测到 {rejected} 行无效记录，未写入输出；请核对列与时间格式。')
    segments = split_points(points, args.max_gap_minutes*60, args.max_gap_km*1000)
    if not segments:
        raise ValueError('所选时间内没有有效连续轨迹，未写入输出。')
    if args.output.exists():
        raise FileExistsError(f'输出已存在，选择新文件以保留已编辑的游记：{args.output}')
    data = {'title': args.title, 'segments': segments, 'stops': []}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf8')
    print(f'已转换 {len(points)} 个点、{len(segments)} 段轨迹，滤除 {low_accuracy} 个低精度点：{args.output}；尚未关联地点图文。')


if __name__ == '__main__':
    main()
