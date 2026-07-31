import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Aperture-0 observatory', () => {
  it('labels the run as a known calibration and starts isolated', () => {
    render(<App />)

    expect(screen.getByText('KNOWN TOY MODEL — NOT A DISCOVERY')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ISOLATED' })).toBeInTheDocument()
    expect(screen.getByText('145.22')).toBeInTheDocument()
    expect(screen.getByText('0.00 bits')).toBeInTheDocument()
    expect(screen.getByText('REFERENCE FIXTURE SNAPSHOT')).toBeInTheDocument()
    expect(screen.getByText('NO INPUT INJECTED')).toBeInTheDocument()
    expect(screen.queryByText('APERTURE-0')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open ISOLATED snapshot' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('describes the stored-fixture integrity check without claiming replay or a flight recorder', async () => {
    render(<App />)

    expect(screen.getByText('FIXTURE INTEGRITY')).toBeInTheDocument()
    expect(screen.getByText('HASH CHAIN')).toBeInTheDocument()
    expect(await screen.findByText('VERIFIED')).toBeInTheDocument()
    expect(screen.queryByText('FLIGHT RECORDER')).not.toBeInTheDocument()
    expect(screen.queryByText('REPLAY')).not.toBeInTheDocument()
    expect(screen.getByText('FIXTURE LOADED')).toBeInTheDocument()
  })

  it('shows geodesic reduction as derived from reference fixture values', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('GEODESIC REDUCTION')).toBeInTheDocument()
    expect(screen.getByText('0.00%')).toBeInTheDocument()
    expect(screen.getByText('derived from reference fixture')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open OPEN snapshot' }))
    expect(screen.getByText('96.61%')).toBeInTheDocument()
  })

  it('steps to OPEN and exposes verified transfer evidence', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Next snapshot' }))
    await user.click(screen.getByRole('button', { name: 'Next snapshot' }))

    expect(screen.getByRole('heading', { name: 'OPEN' })).toBeInTheDocument()
    expect(screen.getByText('8.00 bits')).toBeInTheDocument()
    expect(screen.getByText('APERTURE-0')).toBeInTheDocument()
    expect(screen.getByText('FIXTURE TRANSFORM MATCH')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next snapshot' }))
    expect(screen.getByRole('heading', { name: 'CLOSED' })).toBeInTheDocument()
    expect(screen.queryByText('APERTURE-0')).not.toBeInTheDocument()
    expect(screen.getByText('NO INPUT INJECTED')).toBeInTheDocument()
  })

  it('keeps the payload absent while correlating', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open CORRELATING snapshot' }))

    expect(screen.getByRole('heading', { name: 'CORRELATING' })).toBeInTheDocument()
    expect(screen.queryByText('APERTURE-0')).not.toBeInTheDocument()
    expect(screen.getByText('NO INPUT INJECTED')).toBeInTheDocument()
  })

  it('marks undefined CLOSED metrics as not specified by v0.4', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Open CLOSED snapshot' }))

    expect(screen.getAllByText('N/A')).toHaveLength(2)
    expect(screen.getAllByText('not specified in v0.4')).toHaveLength(2)
  })

  it('switches to the Phase 1 computed toy model with provenance-bound telemetry', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Show Phase 1 computed model' }))
    expect(screen.getByRole('heading', { name: 'PHASE 1 COMPUTED TOY MODEL' })).toBeInTheDocument()
    expect(screen.getByText('100.00')).toBeInTheDocument()
    expect(screen.getByText('48 provenance records verified')).toBeInTheDocument()
    expect(screen.getByText('LOCAL DETERMINISTIC COMPUTATION')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open Phase 1 OPEN snapshot' }))
    expect(screen.getByText('22.73')).toBeInTheDocument()
    expect(screen.getByText('1.00 bits/use')).toBeInTheDocument()
    expect(screen.getByText('16 / 16 BITS ROUTED b→c')).toBeInTheDocument()
    expect(screen.getByText('A0 RECOVERED')).toBeInTheDocument()
  })

  it('announces snapshot state changes to assistive technology', () => {
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('ISOLATED')
  })

  it('resets the observed fixture to its first snapshot', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Next snapshot' }))
    await user.click(screen.getByRole('button', { name: 'Reset run' }))

    expect(screen.getByRole('heading', { name: 'ISOLATED' })).toBeInTheDocument()
    expect(screen.getByText('Snapshot 01 / 04')).toBeInTheDocument()
  })
})
