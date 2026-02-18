import Image from 'next/image'
import Link from 'next/link'

type BrandLogoProps = {
  href?: string
  compact?: boolean
  className?: string
}

export default function BrandLogo({ href = '/', compact = false, className = '' }: BrandLogoProps) {
  const iconSize = compact ? 32 : 48

  const content = (
    <>
      <Image src="/tasktasker-logo-icon.svg" alt="TaskTrasker logo" width={iconSize} height={iconSize} className="rounded-xl" />
      <span className={`font-extrabold leading-none tracking-tight text-slate-100 ${compact ? 'text-lg' : 'text-2xl'}`}>
        <span className="block">Task</span>
        <span className="block">Trasker</span>
      </span>
    </>
  )

  return href ? (
    <Link href={href} className={`inline-flex items-center gap-3 ${className}`}>
      {content}
    </Link>
  ) : (
    <div className={`inline-flex items-center gap-3 ${className}`}>{content}</div>
  )
}
