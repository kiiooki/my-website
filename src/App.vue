<script setup>
import { useAppData } from './app'

const { siteData } = useAppData()
</script>

<template>
  <div v-if="siteData" class="main-body">
    <div id="game-modal-overlay" style="display: none;">
      <div id="game-container">
        <button id="btn-close-game">{{ siteData.game.closeButton }}</button>

        <canvas id="gameCanvas" width="800" height="600"></canvas>

        <div id="ui-layer">
          <div id="top-bar" class="game-ui" style="display: none;">
            <span v-for="item in siteData.game.topBar" :key="item.id">
              {{ item.label }}: <span :id="item.id">{{ item.value }}</span>
            </span>
          </div>

          <div id="start-menu" class="panel active">
            <h1>{{ siteData.game.startMenu.title }}</h1>
            <div id="game-rules">
              <p>
                <strong>{{ siteData.game.startMenu.objective.title }}</strong>
                {{ siteData.game.startMenu.objective.text }}
                <strong>{{ siteData.game.startMenu.objective.limit }}</strong>
                {{ siteData.game.startMenu.objective.suffix }}
              </p>

              <p><strong>{{ siteData.game.startMenu.basicOpsTitle }}</strong></p>
              <ul>
                <li v-for="(item, index) in siteData.game.startMenu.basicOps" :key="`ops-${index}`">
                  <strong>{{ item.title }}</strong>
                  {{ item.text }}
                  <strong>{{ item.emphasis }}</strong>
                  {{ item.suffix }}
                  <strong v-if="item.secondEmphasis">{{ item.secondEmphasis }}</strong>
                  {{ item.ending || '' }}
                </li>
              </ul>

              <p><strong>{{ siteData.game.startMenu.towerTitle }}</strong></p>
              <ul>
                <li v-for="(tower, index) in siteData.game.startMenu.towers" :key="`tower-${index}`">
                  {{ tower.icon }}
                  <strong>{{ tower.name }}:</strong>
                  {{ tower.description }}
                  <strong v-if="tower.highlight">{{ tower.highlight }}</strong>
                </li>
              </ul>

              <p>
                <strong>{{ siteData.game.startMenu.economy.title }}</strong>
                {{ siteData.game.startMenu.economy.text }}
              </p>
              <p>{{ siteData.game.startMenu.tips }}</p>
            </div>
            <button id="btn-start">{{ siteData.game.startMenu.startButton }}</button>
          </div>

          <div id="game-over-menu" class="panel">
            <h1 id="game-over-title">{{ siteData.game.gameOver.title }}</h1>
            <p>{{ siteData.game.gameOver.surviveLabel }} <span id="final-wave"></span></p>
            <div class="panel-buttons panel-buttons-centered">
              <button id="btn-restart">{{ siteData.game.gameOver.restartButton }}</button>
              <button id="btn-back-to-menu" class="secondary-game-btn">{{ siteData.game.gameOver.backButton }}</button>
            </div>
          </div>

          <div id="turret-panel" class="action-panel">
            <h3 id="tp-title">{{ siteData.game.turretPanel.title }}</h3>
            <p>{{ siteData.game.turretPanel.levelLabel }} <span id="tp-level">1</span></p>
            <div class="panel-buttons">
              <button id="btn-upgrade">
                {{ siteData.game.turretPanel.upgradeButton }} (<span id="tp-up-cost">{{ siteData.game.turretPanel.upgradeCost }}</span>g)
              </button>
              <button id="btn-sell" class="sell-btn">
                {{ siteData.game.turretPanel.sellButton }} (<span id="tp-sell-price">{{ siteData.game.turretPanel.sellPrice }}</span>g)
              </button>
            </div>
          </div>

          <div id="build-menu" class="game-ui" style="display: none;">
            <button
              v-for="item in siteData.game.buildMenu"
              :id="item.id"
              :key="item.id"
              :class="['build-btn', { active: item.active }]"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <header class="topbar">
      <div class="topbar-inner">
        <a href="#home" class="nav-brand">{{ siteData.navbar.brand }}</a>
        <nav class="nav-items" aria-label="Primary">
          <a
            v-for="item in siteData.navbar.items"
            :key="item.href"
            :href="item.href"
            class="nav-text-item"
          >
            {{ item.label }}
          </a>
        </nav>
      </div>
    </header>

    <div class="page-shell">
      <section id="home" class="hero-section section-anchor">
        <div class="hero-grid">
          <aside class="profile-column">
            <img :src="siteData.profile.avatar" :alt="siteData.profile.avatarAlt" class="avatar-circle">
            <div class="contact-list">
              <a
                v-for="contact in siteData.profile.contacts"
                :key="contact.text"
                :href="contact.href"
                :target="contact.target"
                :rel="contact.target === '_blank' ? 'noopener noreferrer' : null"
                class="contact-link"
              >
                <i :class="contact.icon"></i>
                <span>{{ contact.text }}</span>
              </a>
            </div>
          </aside>

          <div class="hero-copy">
            <p class="eyebrow">{{ siteData.profile.eyebrow }}</p>
            <h1 class="name-h1">{{ siteData.profile.name }}</h1>
            <p class="subtitle-p">{{ siteData.profile.subtitle }}</p>

            <h2 class="section-title intro-title">{{ siteData.profile.introTitle }}</h2>
            <p
              v-for="paragraph in siteData.profile.introParagraphs"
              :key="paragraph"
              class="text-p"
            >
              {{ paragraph }}
            </p>

            <div class="cta-row">
              <a
                v-for="cta in siteData.profile.ctas"
                :key="cta.label"
                :href="cta.href"
                :target="cta.target || null"
                :rel="cta.target === '_blank' ? 'noopener noreferrer' : null"
                :class="['cta-link', cta.variant === 'secondary' ? 'cta-secondary' : 'cta-primary']"
              >
                {{ cta.label }}
              </a>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section id="skills" class="section-block section-anchor">
          <div class="section-heading">
            <p class="eyebrow">{{ siteData.skills.eyebrow }}</p>
            <h2 class="section-title">{{ siteData.skills.title }}</h2>
          </div>

          <div class="skill-grid">
            <article v-for="group in siteData.skills.groups" :key="group.title" class="skill-column">
              <h3 class="subheading">{{ group.title }}</h3>
              <ul class="bullet-list">
                <li v-for="item in group.items" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="projects" class="section-block section-anchor">
          <div class="section-heading">
            <p class="eyebrow">{{ siteData.projects.eyebrow }}</p>
            <h2 class="section-title">{{ siteData.projects.title }}</h2>
          </div>

          <div class="feature-list">
            <article v-for="project in siteData.projects.items" :key="project.title" class="feature-item">
              <div class="feature-media">
                <img
                  v-if="project.image"
                  :src="project.image"
                  :alt="project.imageAlt || project.title"
                  class="feature-image"
                >
                <div v-else class="media-placeholder">Image Placeholder</div>
              </div>

              <div class="feature-copy">
                <p class="item-label">{{ project.label }}</p>
                <h3 class="item-title">{{ project.title }}</h3>
                <p class="meta-line"><span>{{ project.metaLabel }}</span>{{ project.meta }}</p>
                <p class="summary-p"><span class="summary-label">简介</span>{{ project.summary }}</p>
                <ul class="bullet-list compact-list">
                  <li v-for="point in project.points" :key="point">{{ point }}</li>
                </ul>

                <div v-if="project.resourceLinks && project.resourceLinks.length" class="resource-buttons inline-resource-buttons">
                  <a
                    v-for="link in project.resourceLinks"
                    :key="`${project.title}-${link.label}`"
                    :href="link.url"
                    :title="link.label"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="resource-button"
                  >
                    {{ link.label }}
                  </a>
                </div>

                <div v-if="project.links && project.links.length" class="link-icons">
                  <a
                    v-for="link in project.links"
                    :key="`${project.title}-${link.label}`"
                    :href="link.url"
                    :title="link.label"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="icon-link"
                  >
                    <i :class="link.icon"></i>
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="research" class="section-block section-anchor">
          <div class="section-heading">
            <p class="eyebrow">{{ siteData.research.eyebrow }}</p>
            <h2 class="section-title">{{ siteData.research.title }}</h2>
          </div>

          <div class="feature-list">
            <article v-for="item in siteData.research.items" :key="item.title" class="feature-item">
              <div class="feature-media">
                <div class="media-stack">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.imageAlt || item.title"
                    class="feature-image"
                  >
                  <div v-else class="media-placeholder">Image Placeholder</div>

                  <div v-if="item.links && item.links.length" class="resource-buttons media-icons">
                    <a
                      v-for="link in item.links"
                      :key="`${item.title}-${link.label}`"
                      :href="link.url"
                      :title="link.label"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="resource-button"
                    >
                      {{ link.label }}
                    </a>
                  </div>
                </div>
              </div>

              <div class="feature-copy">
                <p class="item-label">{{ item.label }}</p>
                <h3 class="item-title">{{ item.title }}</h3>
                <p v-if="item.englishTitle" class="english-subtitle">{{ item.englishTitle }}</p>
                <p class="status-line">{{ item.status }}</p>
                <p class="meta-line"><span>{{ item.metaLabel }}</span>{{ item.meta }}</p>
                <p class="summary-p"><span class="summary-label">简介</span>{{ item.summary }}</p>
                <ul class="bullet-list compact-list">
                  <li v-for="point in item.points" :key="point">{{ point }}</li>
                </ul>
              </div>
            </article>
          </div>
        </section>

        <section id="education" class="section-block section-anchor">
          <div class="section-heading">
            <p class="eyebrow">{{ siteData.education.eyebrow }}</p>
            <h2 class="section-title">{{ siteData.education.title }}</h2>
          </div>

          <div class="education-layout">
            <div class="education-main">
              <h3 class="item-title">{{ siteData.education.school }}</h3>
              <p class="summary-p">{{ siteData.education.degree }}</p>
              <div class="stat-list">
                <span v-for="item in siteData.education.stats" :key="item" class="stat-pill">{{ item }}</span>
              </div>
            </div>

            <div class="education-subgrid">
              <div>
                <h3 class="subheading">{{ siteData.education.courseTitle }}</h3>
                <div class="tag-list">
                  <span v-for="course in siteData.education.courses" :key="course" class="tag-pill">{{ course }}</span>
                </div>
              </div>

              <div>
                <h3 class="subheading">{{ siteData.education.honorTitle }}</h3>
                <ul class="bullet-list compact-list">
                  <li v-for="honor in siteData.education.honors" :key="honor">{{ honor }}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer-box">
        <p class="footer-note">{{ siteData.footer.note }}</p>
        <button id="btn-open-game" class="special-btn">{{ siteData.footer.gameButton }}</button>
        <a :href="siteData.footer.topHref" class="top-link">{{ siteData.footer.topText }}</a>
      </footer>
    </div>
  </div>
</template>
