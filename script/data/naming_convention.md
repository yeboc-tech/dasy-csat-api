# Exam File Naming Convention

## Overview
This document specifies the naming convention used for exam files in the system. All filenames follow a standardized format with components separated by underscores (`_`).

## File Format
```
{grade_level}_{category}_{subject}_{selection}_{exam_type}_{exam_year}_{exam_month}_{source}_{doc_type}.pdf
```

## Components

### 1. Grade Level (grade_level)
**Position**: 1st component
**Values**:
- `고1` - 고등학교 1학년
- `고2` - 고등학교 2학년  
- `고3` - 고등학교 3학년

### 2. Category (category)
**Position**: 2nd component
**Values**:
- `국어` - 국어 영역
- `수학` - 수학 영역
- `영어` - 영어 영역
- `한국사` - 한국사 영역
- `사회탐구` - 사회탐구 영역
- `과학탐구` - 과학탐구 영역
- `직업탐구` - 직업탐구 영역
- `제2외국어` - 제2외국어 영역

### 3. Subject (subject)
**Position**: 3rd component
**Values by Category**:

#### 국어 Category
- `국어`

#### 수학 Category  
- `수학`

#### 영어 Category
- `영어`

#### 한국사 Category
- `한국사`

#### 사회탐구 Category
- `생활과 윤리`
- `윤리와 사상`
- `한국지리`
- `세계지리`
- `동아시아사`
- `세계사`
- `경제`
- `정치와 법`
- `사회·문화`

#### 과학탐구 Category
- `물리학 I`
- `물리학 II`
- `화학 I`
- `화학 II`
- `생명과학 I`
- `생명과학 II`
- `지구과학 I`
- `지구과학 II`

#### 직업탐구 Category
- (To be defined based on available subjects)

#### 제2외국어 Category
- (To be defined based on available subjects)

### 4. Selection (selection)
**Position**: 4th component
**Values**:
- `언어와 매체` - For 국어 category
- `화법과 작문` - For 국어 category
- `확률과 통계` - For 수학 category
- `미적분` - For 수학 category
- `기하` - For 수학 category
- `""` (empty string) - For all other categories

### 5. Exam Type (exam_type)
**Position**: 5th component
**Values**:
- `수능` - 대학수학능력시험
- `학력평가` - 학력평가
- `모의고사` - 모의고사

### 6. Exam Year (exam_year)
**Position**: 6th component
**Format**: 4-digit year (e.g., `2024`, `2025`)

### 7. Exam Month (exam_month)
**Position**: 7th component
**Format**: 1-2 digit month (e.g., `6`, `11`)

### 8. Source (source)
**Position**: 8th component
**Values**:
- `평가원` - 한국교육과정평가원
- `교육청` - 교육청
- `사설` - 사설 출제

### 9. Document Type (doc_type)
**Position**: 9th component
**Values**:
- `problem` - 문제지
- `answer` - 정답지/답지
- `explanation` - 해설지

## Examples

### Current Files (2024 수능)
```
고3_국어_국어__수능_2024_11_평가원_problem.pdf
고3_국어_국어__수능_2024_11_평가원_answer.pdf
고3_수학_수학__수능_2024_11_평가원_problem.pdf
고3_수학_수학__수능_2024_11_평가원_answer.pdf
고3_영어_영어__수능_2024_11_평가원_problem.pdf
고3_영어_영어__수능_2024_11_평가원_answer.pdf
고3_한국사_한국사__수능_2024_11_평가원_problem.pdf
고3_한국사_한국사__수능_2024_11_평가원_answer.pdf
고3_사회탐구_생활과 윤리__수능_2024_11_평가원_problem.pdf
고3_사회탐구_생활과 윤리__수능_2024_11_평가원_answer.pdf
고3_과학탐구_물리학 I__수능_2024_11_평가원_problem.pdf
고3_과학탐구_물리학 I__수능_2024_11_평가원_answer.pdf
```

### Future Examples (with selections)
```
고3_국어_국어_언어와 매체_수능_2025_6_평가원_problem.pdf
고3_수학_수학_확률과 통계_수능_2025_6_평가원_problem.pdf
고3_수학_수학_미적분_수능_2025_6_평가원_problem.pdf
고3_수학_수학_기하_수능_2025_6_평가원_problem.pdf
```

## Parsing Guidelines

### For Upload Scripts
1. **Split by underscore**: Use `filename.split('_')` to get components
2. **Handle empty selections**: Empty selection fields result in consecutive underscores (`__`)
3. **Validate components**: Check each component against the allowed values
4. **Extract metadata**: Use components to populate database fields

### Database Schema Considerations
- **Primary Key**: Could be combination of all components or a hash
- **Indexing**: Consider indexing on frequently queried combinations (grade_level, category, subject, exam_year)
- **File Path**: Use components to organize S3 storage structure

### S3 Storage Structure
```
s3://bucket/exams/{grade_level}/{category}/{subject}/{exam_year}/{exam_month}/{source}/{doc_type}/
```

Example:
```
s3://bucket/exams/고3/과학탐구/물리학 I/2024/11/평가원/problem.pdf
```

## Notes
- All components are required and must be present in the filename
- Empty selection fields are represented by empty strings between underscores
- File extensions are always `.pdf`
- Korean characters are used for most components to maintain readability
- The convention is designed to be both human-readable and machine-parseable 