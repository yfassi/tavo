import type { TemplateProps } from '@/lib/types/template'
import { formatPrice } from '@/lib/format'
import styles from './Template.module.css'

export function StreetMinimalTemplate({ data, format }: TemplateProps) {
  const style = {
    '--color-bg': '#fafafa',
    '--color-text': '#111111',
    '--color-accent': data.accentColor,
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
        <div className={styles.content}>
          {data.categories.map((cat, ci) => (
            <div key={ci} className={styles.category} style={{ animationDelay: `${ci * 0.1}s` }}>
              <div className={styles.categoryName}>{cat.name}</div>
              {cat.items.slice(0, maxItems).map((item, ii) => (
                <div
                  key={ii}
                  className={`${styles.item} ${item.isDailySpecial ? styles.dailySpecial : ''}`}
                >
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>
                    {item.prices[0] && formatPrice(item.prices[0].amountCents)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
