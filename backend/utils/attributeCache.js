// 속성 정의 캐싱 유틸리티
const db = require('../config/database');

class AttributeCache {
  constructor() {
    this.definitions = null;
    this.lastUpdate = 0;
    this.cacheTimeout = 60 * 60 * 1000; // 1시간
  }

  async getDefinitions() {
    const now = Date.now();
    
    // 캐시가 유효한 경우
    if (this.definitions && (now - this.lastUpdate) < this.cacheTimeout) {
      return this.definitions;
    }

    // 캐시 갱신
    try {
      this.definitions = await db('attribute_definitions')
        .select('attribute_key', 'is_encrypted', 'is_sensitive', 'category', 'data_type');
      
      // 키로 빠른 검색을 위한 Map 생성
      this.definitionMap = new Map();
      for (const def of this.definitions) {
        this.definitionMap.set(def.attribute_key, def);
      }
      
      this.lastUpdate = now;
      console.log('✅ 속성 정의 캐시 갱신');
      
      return this.definitions;
    } catch (error) {
      console.error('속성 정의 로드 실패:', error);
      return this.definitions || [];
    }
  }

  getDefinition(key) {
    return this.definitionMap ? this.definitionMap.get(key) : null;
  }

  // 캐시 무효화
  invalidate() {
    this.definitions = null;
    this.definitionMap = null;
    this.lastUpdate = 0;
  }
}

// 싱글톤 인스턴스
const attributeCache = new AttributeCache();

module.exports = attributeCache;