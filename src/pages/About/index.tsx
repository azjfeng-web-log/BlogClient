import { Card, Avatar, Tag, Divider } from 'antd'
import { 
  GithubOutlined, 
  MailOutlined, 
  WechatOutlined,
  CodeOutlined
} from '@ant-design/icons'
import styles from './About.module.scss'

const skills = [
  { name: 'React', level: 90 },
  { name: 'Vue', level: 85 },
  { name: 'TypeScript', level: 88 },
  { name: 'Node.js', level: 80 },
  { name: 'Python', level: 75 },
  { name: 'Docker', level: 70 }
]

export default function About() {
  return (
    <div className={styles.about}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <Avatar size={120} src="https://api.dicebear.com/7.x/avataaars/svg?seed=blog" />
          <h1>关于我</h1>
          <p className={styles.bio}>全栈开发工程师 / 技术博主</p>
        </div>

        <Divider />

        <div className={styles.section}>
          <h2><CodeOutlined /> 技能栈</h2>
          <div className={styles.skills}>
            {skills.map((skill) => (
              <div key={skill.name} className={styles.skillItem}>
                <div className={styles.skillHeader}>
                  <span>{skill.name}</span>
                  <span>{skill.level}%</span>
                </div>
                <div className={styles.skillBar}>
                  <div 
                    className={styles.skillProgress} 
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <h2>个人简介</h2>
          <p className={styles.intro}>
            热爱编程，专注于前端开发和全栈技术。喜欢研究新技术，分享学习心得。
            工作之余，喜欢写技术博客，希望能帮助更多的开发者成长。
          </p>
        </div>

        <Divider />

        <div className={styles.section}>
          <h2>联系方式</h2>
          <div className={styles.contacts}>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <GithubOutlined /> GitHub
            </a>
            <a href="mailto:example@email.com">
              <MailOutlined /> Email
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}
