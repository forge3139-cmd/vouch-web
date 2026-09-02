'use client'

import { useState } from 'react'
import { LanguageProvider } from '@/components/LanguageContext'
import LanguageStep from '@/components/steps/LanguageStep'
import RequestIntroStep from '@/components/request-steps/RequestIntroStep'
import RequestDetailsStep from '@/components/request-steps/RequestDetailsStep'
import RequestContactStep from '@/components/request-steps/RequestContactStep'
import RequestSentStep from '@/components/request-steps/RequestSentStep'
import type { WorkerRequestBundle } from '@/lib/types'

type Step = 'language' | 'intro' | 'details' | 'contact' | 'sent'

export interface RequestDraft {
  title: string
  description: string
  specifications: string
  location: string
  neededBy: string
  photos: File[]
}

const emptyDraft: RequestDraft = {
  title: '',
  description: '',
  specifications: '',
  location: '',
  neededBy: '',
  photos: [],
}

export default function WorkRequestFlow({
  bundle,
  slug,
}: {
  bundle: WorkerRequestBundle
  slug: string
}) {
  return (
    <LanguageProvider>
      <Flow bundle={bundle} slug={slug} />
    </LanguageProvider>
  )
}

function Flow({ bundle, slug }: { bundle: WorkerRequestBundle; slug: string }) {
  const [step, setStep] = useState<Step>('language')
  const [draft, setDraft] = useState<RequestDraft>(emptyDraft)

  if (step === 'language') {
    return <LanguageStep onChosen={() => setStep('intro')} />
  }

  if (step === 'intro') {
    return (
      <RequestIntroStep worker={bundle.worker} evidence={bundle.evidence} onStart={() => setStep('details')} />
    )
  }

  if (step === 'details') {
    return <RequestDetailsStep draft={draft} onChange={setDraft} onNext={() => setStep('contact')} />
  }

  if (step === 'contact') {
    return (
      <RequestContactStep
        slug={slug}
        draft={draft}
        onBack={() => setStep('details')}
        onSent={() => setStep('sent')}
      />
    )
  }

  return <RequestSentStep workerName={bundle.worker.display_name} />
}
