"""Independently check a finite graph certificate using only Python's standard library.

No imports from the JavaScript search engine. Default checks the witness and
declared prefix length; --replay-search also checks firstness and admissible count.
"""
import argparse
import itertools
import json
import math
from pathlib import Path
import sys

CONCLUSIONS = {
    "contains_triangle": "contain a triangle", "is_cycle": "be exactly one cycle",
    "is_bipartite": "be bipartite", "has_perfect_matching": "have a perfect matching",
    "has_even_edge_count": "have an even number of edges", "diameter_at_most_2": "have diameter at most 2",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def integer(value, low, high):
    return type(value) is int and low <= value <= high


def identical(actual, expected):
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, list):
        return len(actual) == len(expected) and all(identical(a, b) for a, b in zip(actual, expected))
    if isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(identical(actual[k], v) for k, v in expected.items())
    return actual == expected


def analyze(n, edges):
    """Use all-pairs distances and exhaustive colorings/matchings at n <= 6."""
    matrix = [[False] * n for _ in range(n)]
    for a, b in edges:
        matrix[a][b] = matrix[b][a] = True
    degrees = [sum(row) for row in matrix]
    distance = [[0 if i == j else 1 if matrix[i][j] else n + 1 for j in range(n)] for i in range(n)]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                distance[i][j] = min(distance[i][j], distance[i][k] + distance[k][j])
    diameter = max(max(row) for row in distance)
    connected = diameter <= n - 1
    triangles = sum(matrix[a][b] and matrix[a][c] and matrix[b][c] for a, b, c in itertools.combinations(range(n), 3))
    bipartite = any(all(((color >> a) & 1) != ((color >> b) & 1) for a, b in edges) for color in range(1 << n))
    matching = n % 2 == 0 and any(all(matrix[order[i]][order[i + 1]] for i in range(0, n, 2)) for order in itertools.permutations(range(n)))
    return {"vertices": n, "edges": len(edges), "degrees": degrees,
            "minDegree": min(degrees), "maxDegree": max(degrees), "connected": connected,
            "triangles": triangles, "bipartite": bipartite, "diameter": diameter if connected else None,
            "isCycle": connected and all(d == 2 for d in degrees), "allEven": all(d % 2 == 0 for d in degrees),
            "perfectMatching": matching, "density": 2 * len(edges) / (n * (n - 1))}


def assumptions_hold(m, a):
    return ((not a['connected'] or m['connected'])
            and (a['minDegree'] is None or m['minDegree'] >= a['minDegree'])
            and (a['bipartite'] == 'any' or m['bipartite'] == (a['bipartite'] == 'yes'))
            and (not a['triangleFree'] or m['triangles'] == 0)
            and (not a['allEven'] or m['allEven'])
            and (not a['evenOrder'] or m['vertices'] % 2 == 0)
            and (a['edgeSurplus'] is None or m['edges'] >= m['vertices'] + a['edgeSurplus'])
            and (a['maxDiameter'] is None or (m['diameter'] is not None and m['diameter'] <= a['maxDiameter'])))


def conclusion_holds(m, conclusion):
    return {"contains_triangle": m['triangles'] > 0, "is_cycle": m['isCycle'],
            "is_bipartite": m['bipartite'], "has_perfect_matching": m['perfectMatching'],
            "has_even_edge_count": m['edges'] % 2 == 0,
            "diameter_at_most_2": m['diameter'] is not None and m['diameter'] <= 2}[conclusion]


def claim_text(a, conclusion):
    parts = []
    if a['connected']: parts.append('connected')
    if a['minDegree'] is not None: parts.append(f"minimum degree at least {a['minDegree']}")
    if a['bipartite'] != 'any': parts.append('bipartite' if a['bipartite'] == 'yes' else 'non-bipartite')
    if a['triangleFree']: parts.append('triangle-free')
    if a['allEven']: parts.append('all degrees even')
    if a['evenOrder']: parts.append('even order')
    if a['edgeSurplus'] is not None: parts.append('at least as many edges as vertices' if a['edgeSurplus'] == 0 else 'at least one more edge than vertices')
    if a['maxDiameter'] is not None: parts.append(f"diameter at most {a['maxDiameter']}")
    premise = ', '.join(parts) + ' graph' if parts else 'finite simple graph'
    return f"Every {premise} with at least 3 vertices must {CONCLUSIONS[conclusion]}."


def verify(certificate, replay=False):
    c = certificate
    require(isinstance(c, dict) and c.get('schema') == 'finite-witness/certificate-v1', 'Unsupported certificate schema')
    config = c['config']; a = config['assumptions']; conclusion = config['conclusion']
    require(conclusion in CONCLUSIONS, 'Unknown conclusion')
    require(integer(config['maxVertices'], 3, 6), 'Invalid search bound')
    for key in ['connected', 'triangleFree', 'allEven', 'evenOrder']:
        require(type(a[key]) is bool, f'Invalid assumption {key}')
    for key, allowed in [('minDegree', [1, 2, 3]), ('edgeSurplus', [0, 1]), ('maxDiameter', [2, 3])]:
        require(a[key] is None or (type(a[key]) is int and a[key] in allowed), f'Invalid assumption {key}')
    require(a['bipartite'] in ['any', 'yes', 'no'], 'Invalid bipartite assumption')
    require(c['claim'] == claim_text(a, conclusion), 'Claim text disagrees with structured configuration')
    w = c['witness']; n = w['vertices']; edges = w['edges']; mask = w['edge_mask']
    require(integer(n, 3, config['maxVertices']), 'Invalid vertex count')
    pairs = list(itertools.combinations(range(n), 2))
    require(integer(mask, 0, (1 << len(pairs)) - 1), 'Invalid edge mask')
    require(isinstance(edges, list) and len(edges) <= len(pairs), 'Invalid edge list')
    require(all(isinstance(e, list) and len(e) == 2 and integer(e[0], 0, n - 1) and integer(e[1], 0, n - 1) and e[0] < e[1] for e in edges), 'Invalid simple edge')
    expected_edges = [list(e) for bit, e in enumerate(pairs) if mask & (1 << bit)]
    require(edges == expected_edges, 'Edges disagree with canonical edge mask')
    metrics = analyze(n, edges)
    for key, expected in metrics.items():
        actual = w['metrics'][key]
        if key == 'density':
            require(type(actual) in [int, float] and math.isfinite(actual) and abs(actual - expected) <= 1e-12, 'Incorrect density')
        else:
            require(identical(actual, expected), f'Incorrect metric: {key}')
    require(assumptions_hold(metrics, a), 'Witness does not satisfy the assumptions')
    require(not conclusion_holds(metrics, conclusion), 'Graph is not a counterexample')
    search = c['search']; prefix = search['searched_prefix']
    require(search['domain'] == 'labeled finite simple graphs with at least 3 vertices', 'Unknown graph domain')
    require(search['order'] == 'vertex count, then labeled edge-mask order', 'Unknown search order')
    require(identical(search['requested_range'], [3, config['maxVertices']]), 'Search range mismatch')
    require(identical(prefix['fully_checked_vertex_counts'], list(range(3, n))), 'Invalid completed prefix')
    require(identical(prefix['first_counterexample_at'], {'vertices': n, 'edge_mask': mask}), 'Invalid stopping point')
    require(prefix['stopped_after_first_counterexample'] is True and search['bounded_result'] == 'counterexample', 'Invalid result kind')
    expected_count = sum(1 << (k * (k - 1) // 2) for k in range(3, n)) + mask + 1
    require(type(search['candidates_tested']) is int and search['candidates_tested'] == expected_count, 'Incorrect prefix length')
    require(integer(search['admissible_graphs_in_searched_prefix'], 1, expected_count), 'Invalid admissible count')
    if replay:
        admissible = 0
        for k in range(3, n + 1):
            candidates = list(itertools.combinations(range(k), 2))
            stop = mask + 1 if k == n else 1 << len(candidates)
            for current in range(stop):
                m = analyze(k, [edge for bit, edge in enumerate(candidates) if current & (1 << bit)])
                if assumptions_hold(m, a):
                    admissible += 1
                    if not conclusion_holds(m, conclusion):
                        require(k == n and current == mask, 'An earlier counterexample exists')
        require(admissible == search['admissible_graphs_in_searched_prefix'], 'Incorrect admissible prefix count')
    return {'status': 'PASS', 'witness_valid': True, 'prefix_length_checked': True,
            'first_in_declared_order': 'VERIFIED' if replay else 'NOT_CHECKED',
            'admissible_count': 'VERIFIED' if replay else 'NOT_CHECKED',
            'metrics': metrics, 'scope': 'Finite simple graphs; no general proof or producer authentication. Certificate ID is an informational label.'}


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'Duplicate JSON key')
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('certificate', type=Path)
    parser.add_argument('--replay-search', action='store_true')
    args = parser.parse_args()
    try:
        require(args.certificate.stat().st_size <= 1_000_000, 'Certificate exceeds 1 MB')
        c = json.loads(args.certificate.read_text(encoding='utf-8'), object_pairs_hook=no_duplicates,
                       parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Non-finite JSON number')))
        print(json.dumps(verify(c, args.replay_search), ensure_ascii=False, allow_nan=False))
        return 0
    except (ValueError, TypeError, KeyError, OSError, OverflowError, RecursionError) as error:
        print(json.dumps({'status': 'FAIL', 'error': str(error)}))
        return 1


if __name__ == '__main__':
    sys.exit(main())
