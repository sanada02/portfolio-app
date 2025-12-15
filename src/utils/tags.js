// src/utils/tags.js

// タグをlocalStorageから取得
export const getTags = () => {
  const data = localStorage.getItem('tags');
  return data ? JSON.parse(data) : [];
};

// タグを保存
export const saveTags = (tags) => {
  localStorage.setItem('tags', JSON.stringify(tags));
};

// 新しいタグを追加
export const addTag = (tagName, color = null) => {
  const tags = getTags();
  
  // 既に存在するかチェック
  if (tags.find(t => t.name === tagName)) {
    return tags;
  }
  
  // ランダムな色を生成（指定がない場合）
  const tagColor = color || `#${Math.floor(Math.random()*16777215).toString(16)}`;
  
  const newTag = {
    id: Date.now().toString(),
    name: tagName,
    color: tagColor
  };
  
  const updatedTags = [...tags, newTag];
  saveTags(updatedTags);
  return updatedTags;
};

// タグを削除
export const deleteTag = (tagName) => {
  const tags = getTags();
  const updatedTags = tags.filter(t => t.name !== tagName);
  saveTags(updatedTags);
  return updatedTags;
};

// タグの色を取得
export const getTagColor = (tagName) => {
  const tags = getTags();
  const tag = tags.find(t => t.name === tagName);
  return tag ? tag.color : '#667eea';
};

// デフォルトタグカラーパレット
export const TAG_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe',
  '#43e97b', '#fa709a', '#fee140', '#30cfd0',
  '#a8edea', '#fed6e3', '#c471ed', '#f64f59'
];