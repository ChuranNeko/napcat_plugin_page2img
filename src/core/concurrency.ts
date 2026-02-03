/**
 * 并发控制模块
 * 负责管理渲染任务的并发队列
 * 属于后端核心层
 */

/**
 * 队列项类型
 */
type QueueItem = () => void;

/**
 * 活跃任务计数
 */
let activeTasks = 0;

/**
 * 等待队列
 */
const renderQueue: QueueItem[] = [];

/**
 * 最大并发数
 */
let maxConcurrent = 3;

/**
 * 初始化并发控制
 */
export function initConcurrency(max: number): void {
  maxConcurrent = max;
}

/**
 * 获取队列槽位
 * 如果当前活跃任务数达到上限，则等待
 */
export async function acquireSlot(): Promise<void> {
  if (activeTasks < maxConcurrent) {
    activeTasks++;
    return;
  }

  // 限制队列长度，避免无限增长
  const MAX_QUEUE_SIZE = 100;
  if (renderQueue.length >= MAX_QUEUE_SIZE) {
    throw new Error('渲染队列已满，请稍后重试');
  }

  return new Promise<void>((resolve) => {
    renderQueue.push(resolve);
  });
}

/**
 * 释放队列槽位
 */
export function releaseSlot(): void {
  activeTasks--;

  // 唤醒队列中的下一个任务
  const next = renderQueue.shift();
  if (next) {
    activeTasks++;
    next();
  }
}

/**
 * 获取当前活跃任务数
 */
export function getActiveTasks(): number {
  return activeTasks;
}

/**
 * 获取当前队列长度
 */
export function getQueueLength(): number {
  return renderQueue.length;
}

/**
 * 重置并发控制状态
 */
export function resetConcurrency(): void {
  activeTasks = 0;
  renderQueue.length = 0;
}
