import { MdContentCopy } from 'react-icons/md';
import React, { useState } from 'react';
import styles from './Contact.module.css'; // Ensure the CSS module is updated accordingly
import Graphic from './Graphic';
import eye from 'assets/eye.png';
import CustomMouseTrail from '../../layouts/Home/Mouse';

export const Contact = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText('shaiderhb@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Message disappears after 2 seconds
  };

  return (
    <div>
      <CustomMouseTrail />
      {/* <Graphic /> */}
      <div className={styles.contact}>
        <div className={styles.container}>
          <div className={styles.flexWrap}>
            <div className={styles.leftColumn}>
              <h1 className={styles.mainTitle}>Get in</h1>
              <div className={styles.titleContainer}>
                <img
                  src={eye.src}
                  alt="Stylized eye illustration"
                  className={styles.image}
                />
                <h1 className={styles.mainTitle}>touch</h1>
              </div>
              <div className={styles.emailSection}>
                <a href="mailto:shaiderhb@gmail.com" className={styles.emailLink}>
                  SHaiderHB@gmail.com
                </a>
                <MdContentCopy className={styles.copyIcon} onClick={copyToClipboard} />
                {copied && <span className={styles.copiedPopup}>Copied!</span>}
              </div>
            </div>
            <div className={styles.rightColumn}>
              <div className={styles.textBlock}>
                <h2 className={styles.secondaryTitle}>
                  Whether you have any questions or just want to say hi, I&apos;ll be
                  happy to hear from you!
                </h2>
              </div>
              <div className={styles.textBlock}></div>
              <div>
                <h3 className={styles.tertiaryTitle}>Social Links</h3>
                <p>
                  <a
                    href="https://github.com/yourusername"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    GitHub
                  </a>
                </p>
                <p>
                  <a
                    href="https://linkedin.com/in/yourusername"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    LinkedIn
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
