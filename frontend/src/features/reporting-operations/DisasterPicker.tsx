import { useEffect, useState } from 'react'
import { EmptyState, ErrorMessage, Loading } from '../../shared/components'
import { disasterTypes, type Disaster, type DisasterPage } from '../disaster/disaster-api'
import { typeLabels } from '../disaster/DisasterBadges'
import { listActiveDisasters } from './reporting-api'
import { errorText, Pagination } from './presentation'

export function DisasterPicker({ selected, onSelect, disabled, invalid }: { selected?: Disaster; onSelect: (value?: Disaster) => void; disabled: boolean; invalid: boolean }) {
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<DisasterPage>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setResult(undefined); setError('')
    listActiveDisasters(page, type).then(value => {
      if (!active) return
      if (page > 0 && page >= value.totalPages) setPage(Math.max(0, value.totalPages - 1))
      else setResult(value)
    }).catch(reason => { if (active) setError(errorText(reason)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, type, retry])
  return <section className="report-picker" aria-label="Chọn thảm họa ACTIVE">
    <div className="report-filter-status"><label htmlFor="disaster-type-filter">Lọc thảm họa theo loại</label><select id="disaster-type-filter" disabled={disabled} value={type} onChange={event => {
      setType(event.target.value); setPage(0); onSelect(undefined)
    }}><option value="">Tất cả loại</option>{disasterTypes.map(value => <option key={value} value={value}>{typeLabels[value]}</option>)}</select></div>
    <p className="muted">Chỉ thảm họa ACTIVE. Dùng bộ lọc loại và các trang để tìm thảm họa cần liên kết.</p>
    {loading ? <Loading>Đang tải thảm họa…</Loading> : error ? <><ErrorMessage>{error}</ErrorMessage><button type="button" className="secondary" disabled={disabled} onClick={() => setRetry(value => value + 1)}>Tải lại thảm họa</button></> : result && <>
      {result.items.length ? <div className="report-filter-status"><label htmlFor="active-disaster">Thảm họa đang hoạt động</label><select id="active-disaster" disabled={disabled} aria-invalid={invalid} aria-describedby="decision-error" value={selected?.id ?? ''} onChange={event => onSelect(result.items.find(item => item.id === event.target.value))}>
        <option value="">Chọn thảm họa</option>{result.items.filter(item => item.status === 'ACTIVE').map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
      </select></div> : <EmptyState>Không có thảm họa ACTIVE phù hợp. Thử đổi loại.</EmptyState>}
      <Pagination page={result.page} totalPages={result.totalPages} disabled={disabled} label="Phân trang thảm họa" onPage={value => { setPage(value); onSelect(undefined) }} />
    </>}
  </section>
}
