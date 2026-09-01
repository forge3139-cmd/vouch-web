'use client'

import { useState } from 'react'
import { LanguageProvider, useT } from '@/components/LanguageContext'
import LanguageStep from '@/components/steps/LanguageStep'
import AskStep from '@/components/steps/AskStep'
import QuestionsStep from '@/components/steps/QuestionsStep'
import SuccessStep from '@/components/steps/SuccessStep'
import DeclineStep from '@/components/steps/DeclineStep'
import type { ConfirmationBundle } from '@/lib/types'

type Step = 'language' | 'ask' | 'questions' | 'success' | 'decline' | 'declined'

export default function ConfirmationFlow({ bundle }: { bundle: ConfirmationBundle }) {
  return (
    <LanguageProvider>
      <Flow bundle={bundle} />
    </LanguageProvider>
  )
}

function Flow({ bundle }: { bundle: ConfirmationBundle }) {
  const [step, setStep] = useState<Step>('language')
  const [confirmedCount, setConfirmedCount] = useState(bundle.confirmedCount)
  const t = useT()

  if (step === 'language') {
    return <LanguageStep onChosen={() => setStep('ask')} />
  }

  if (step === 'ask') {
    return (
      <AskStep
        bundle={bundle}
        onConfirm={() => setStep('questions')}
        onDecline={() => setStep('decline')}
      />
    )
  }

  if (step === 'questions') {
    return (
      <QuestionsStep
        token={bundle.link.token}
        originalWhat={bundle.record.description ?? bundle.record.title}
        onBack={() => setStep('ask')}
        onSubmitted={(count) => {
          setConfirmedCount(count)
          setStep('success')
        }}
      />
    )
  }

  if (step === 'decline') {
    return (
      <DeclineStep
        token={bundle.link.token}
        onBack={() => setStep('ask')}
        onDeclined={() => setStep('declined')}
      />
    )
  }

  if (step === 'declined') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-card-border text-2xl">
          🙏
        </div>
        <h1 className="text-xl font-extrabold text-ink">{t('decline', 'title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('decline', 'body')}</p>
      </div>
    )
  }

  return <SuccessStep worker={bundle.worker} confirmedCount={confirmedCount} />
}
