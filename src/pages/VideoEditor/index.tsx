import Header from './components/Header'
import MediaLibrary from './components/MediaLibrary'
import PreviewCanvas from './components/PreviewCanvas'
import PropertyPanel from './components/PropertyPanel'
import Timeline from './components/Timeline/Timeline'
import styles from './index.module.scss'

export default function VideoEditor() {
  return (
    <div className={styles.editor}>
      <Header />
      <div className={styles.main}>
        <MediaLibrary />
        <PreviewCanvas />
        <PropertyPanel />
      </div>
      <div className={styles.bottom}>
        <Timeline />
      </div>
    </div>
  )
}
