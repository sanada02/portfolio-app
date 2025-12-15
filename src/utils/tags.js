// src/utils/tags.js

const TAGS_STORAGE_KEY = 'portfolio_tags';

// タグ用の色パレット
export const TAG_COLORS = [
  '#4F46E5', // インディゴ
  '#059669', // グリーン
  '#DC2626', // レッド
  '#D97706', // オレンジ
  '#7C3AED', // パープル
  '#0891B2', // シアン
  '#DB2777', // ピンク
  '#65A30D', // ライム
  '#0D9488', // ティール
  '#C026D3', // フューシャ
  '#CA8A04', // イエロー
  '#2563EB', // ブルー
];

// タグ一覧を取得
export function getTags() {
  const tagsJson = localStorage.getItem(TAGS_STORAGE_KEY);
  return tagsJson ? JSON.parse(tagsJson) : [];
}

// タグを保存
function saveTags(tags) {
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
}

// 新しいタグを追加
export function addTag(tagName) {
  const tags = getTags();
  
  // 既存チェック
  if (tags.some(tag => tag.name === tagName)) {
    return tags;
  }
  
  const newTag = {
    id: `tag_${Date.now()}`,
    name: tagName,
    color: getTagColor(tagName),
    createdAt: new Date().toISOString()
  };
  
  const updatedTags = [...tags, newTag];
  saveTags(updatedTags);
  return updatedTags;
}

// タグを更新
export function updateTag(tagId, newName) {
  const tags = getTags();
  const updatedTags = tags.map(tag =>
    tag.id === tagId ? { ...tag, name: newName } : tag
  );
  saveTags(updatedTags);
  
  // ポートフォリオのタグ名も更新
  updatePortfolioTags(tags.find(t => t.id === tagId)?.name, newName);
  
  return updatedTags;
}

// タグを削除
export function deleteTag(tagId) {
  const tags = getTags();
  const tagToDelete = tags.find(t => t.id === tagId);
  const updatedTags = tags.filter(tag => tag.id !== tagId);
  saveTags(updatedTags);
  
  // ポートフォリオからもタグを削除
  if (tagToDelete) {
    removeTagFromPortfolio(tagToDelete.name);
  }
  
  return updatedTags;
}

// ポートフォリオ内のタグ名を更新
function updatePortfolioTags(oldName, newName) {
  const portfolioJson = localStorage.getItem('portfolio');
  if (!portfolioJson) return;
  
  const portfolio = JSON.parse(portfolioJson);
  const updatedPortfolio = portfolio.map(asset => {
    if (asset.tags && asset.tags.includes(oldName)) {
      return {
        ...asset,
        tags: asset.tags.map(tag => tag === oldName ? newName : tag)
      };
    }
    return asset;
  });
  
  localStorage.setItem('portfolio', JSON.stringify(updatedPortfolio));
}

// ポートフォリオからタグを削除
function removeTagFromPortfolio(tagName) {
  const portfolioJson = localStorage.getItem('portfolio');
  if (!portfolioJson) return;
  
  const portfolio = JSON.parse(portfolioJson);
  const updatedPortfolio = portfolio.map(asset => {
    if (asset.tags && asset.tags.includes(tagName)) {
      return {
        ...asset,
        tags: asset.tags.filter(tag => tag !== tagName)
      };
    }
    return asset;
  });
  
  localStorage.setItem('portfolio', JSON.stringify(updatedPortfolio));
}

// タグ名から一貫した色を生成
export function getTagColor(tagName) {
  const tags = getTags();
  const existingTag = tags.find(tag => tag.name === tagName);
  
  if (existingTag) {
    return existingTag.color;
  }
  
  // 文字列からハッシュ値を生成
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // ハッシュ値を使って色パレットから選択
  const colorIndex = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[colorIndex];
}