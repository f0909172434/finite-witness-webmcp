# Independently check a saved witness

The Python checker uses no JavaScript engine code and needs only Python 3.9+. Copy a certificate from the workbench, or use the committed C4 example:

```sh
python3 tools/verify_certificate.py examples/c4-certificate.json
python3 tools/verify_certificate.py examples/c4-certificate.json --replay-search
```

The first command reconstructs the graph from the edges and checks its canonical edge mask, every metric, the structured assumptions, the conclusion, the claim text, and the declared prefix length. It labels firstness and the admissible count `NOT_CHECKED`.

The second command enumerates the declared prefix independently. Only this mode verifies that no earlier counterexample exists and that the admissible count is correct. Neither mode claims anything about graphs outside the stated domain. The short `certificate_id` is a display label, not a signature or proof of producer identity.

Both commands return one JSON object and exit 1 on failure. Duplicate JSON keys, unsupported schemas, invalid dimensions, altered metrics and incompatible search metadata are rejected. Input is limited to 1 MB and 3–6 vertices. The independent implementation uses all-pairs distances, exhaustive colorings and matchings, so it is intended for small certificate checks rather than interactive search.

Tests exercise all four demo scenarios, altered claims/graphs/counts, and a valid later witness that must fail firstness verification. To preserve this evidence in a research notebook, keep the certificate, checker result and their SHA-256 digests together; a passed check must not silently promote a broader research claim.

## 繁體中文

第一個命令檢查「這張圖是否真的構成反例」，第二個加上 `--replay-search` 的命令才重播搜尋前綴、確認沒有更早的反例。不要把有效反例、最小性與一般定理證明合成同一個結論。匯入 RigorGraph 時，保存原始憑證與檢查結果，並為它們寫明相同的有限範圍。
