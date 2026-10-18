import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider, LanguageSwitcher, useI18n } from './i18n'

function LanguageFixture() {
  const { language, t } = useI18n()
  return <>
    <LanguageSwitcher />
    <output aria-label="current language">{language}</output>
    <p>{t('login.title')}</p>
  </>
}

describe('language switcher', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to English and switches between English and Vietnamese', async () => {
    const user = userEvent.setup()
    render(<I18nProvider><LanguageFixture /></I18nProvider>)

    expect(screen.getByLabelText('current language')).toHaveTextContent('en')
    expect(screen.getByText('Sign in to GDRN')).toBeVisible()
    expect(document.documentElement).toHaveAttribute('lang', 'en')

    await user.click(screen.getByRole('button', { name: 'Switch language to Vietnamese' }))
    expect(screen.getByLabelText('current language')).toHaveTextContent('vi')
    expect(screen.getByText('Đăng nhập GDRN')).toBeVisible()
    expect(localStorage.getItem('gdrn.language')).toBe('vi')
    expect(document.documentElement).toHaveAttribute('lang', 'vi')

    await user.click(screen.getByRole('button', { name: 'Đổi ngôn ngữ sang Tiếng Anh' }))
    expect(screen.getByLabelText('current language')).toHaveTextContent('en')
    expect(screen.getByText('Sign in to GDRN')).toBeVisible()
    expect(localStorage.getItem('gdrn.language')).toBe('en')
  })
})
