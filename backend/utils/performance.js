// 성능 모니터링 유틸리티

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  // API 응답 시간 측정 미들웨어
  measureResponseTime() {
    return (req, res, next) => {
      const start = Date.now();
      
      // 원본 res.end 저장
      const originalEnd = res.end;
      
      res.end = function(...args) {
        const duration = Date.now() - start;
        
        // 성능 메트릭 기록
        const route = req.route?.path || req.path;
        const method = req.method;
        const key = `${method} ${route}`;
        
        if (!this.metrics[key]) {
          this.metrics[key] = {
            count: 0,
            totalTime: 0,
            avgTime: 0,
            minTime: Infinity,
            maxTime: 0
          };
        }
        
        const metric = this.metrics[key];
        metric.count++;
        metric.totalTime += duration;
        metric.avgTime = metric.totalTime / metric.count;
        metric.minTime = Math.min(metric.minTime, duration);
        metric.maxTime = Math.max(metric.maxTime, duration);
        
        // 느린 요청 경고 (500ms 이상)
        if (duration > 500) {
          console.warn(`⚠️ Slow request: ${key} took ${duration}ms`);
        }
        
        // 응답 헤더에 성능 정보 추가
        res.set('X-Response-Time', `${duration}ms`);
        
        originalEnd.apply(res, args);
      }.bind(this);
      
      next();
    };
  }
  
  // 성능 메트릭 가져오기
  getMetrics() {
    return this.metrics;
  }
  
  // 성능 리포트 생성
  generateReport() {
    const report = [];
    
    for (const [route, metric] of Object.entries(this.metrics)) {
      report.push({
        route,
        calls: metric.count,
        avgTime: `${metric.avgTime.toFixed(2)}ms`,
        minTime: `${metric.minTime}ms`,
        maxTime: `${metric.maxTime}ms`
      });
    }
    
    // 평균 시간으로 정렬 (느린 것부터)
    report.sort((a, b) => parseFloat(b.avgTime) - parseFloat(a.avgTime));
    
    return report;
  }
  
  // 메트릭 초기화
  reset() {
    this.metrics = {};
  }
}

// 싱글톤 인스턴스
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;