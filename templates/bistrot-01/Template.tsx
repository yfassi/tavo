import type { TemplateProps } from '@/lib/types/template'
import { formatPrice } from '@/lib/format'
import styles from './Template.module.css'

export function BistrotArdoiseTemplate({ data, format }: TemplateProps) {
  const style = {
    '--color-bg': '#2d2d2d',
    '--color-text': '#f5f0e8',
    '--color-accent': data.accentColor,
    '--font-heading': "'Playfair Display', serif",
    '--font-body': "'Lora', serif",
  } as React.CSSProperties

  const maxItems = format === 'landscape' ? 8 : 6

  return (
    <div className={styles.container}>
      <div className={styles.wrapper} style={style}>
        <div className={styles.header}>
          {data.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.logo} src={data.logo} alt="" />
          )}
          <span className={styles.venueName}>{data.venueName}</span>
        </div>
        <div className={styles.divider} />

        <div className={styles.content}>
          {data.categories.map((cat, ci) => {
            const visibleItems = cat.items.slice(0, maxItems)
            return (
              <div key={ci} className={styles.category} style={{ animationDelay: `${ci * 0.2}s` }}>
                <div className={styles.categoryName}>{cat.name}</div>
                <div className={styles.categoryDivider} />
                {visibleItems.map((item, ii) => (
                  <div
                    key={ii}
                    className={`${styles.item} ${item.isDailySpecial ? styles.dailySpecial : ''}`}
                  >
                    <div className={styles.itemHeader}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemDots} />
                      <span className={styles.itemPrice}>
                        {item.prices[0] && formatPrice(item.prices[0].amountCents)}
                      </span>
                    </div>
                    {item.description && (
                      <div className={styles.itemDescription}>{item.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
