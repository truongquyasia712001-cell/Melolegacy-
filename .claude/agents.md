# Claude Code Agents - Melolegacy

Configuration for specialized agents handling different parts of the project.

## Agent Types

### 1. Lead Engineer (Default)
**Role**: Code quality, architecture review, QA
- Reviews all output
- Ensures zero-defect standard
- Skills: All design skills

### 2. UI/Design Agent
**Role**: Frontend components, styling, responsive design
- Converts designs to React code
- Applies UI skill standards
- Skills: ui-skill, image-to-code, awesome-design

### 3. Testing Agent
**Role**: Test automation, quality assurance
- Writes Playwright tests
- Validates on multiple browsers
- iPad/mobile testing
- Skills: playwright-cli, awesome-design

### 4. Music Theory Agent
**Role**: Music notation logic, MusicXML, Verovio
- Validates music theory accuracy
- Checks Verovio rendering
- Reviews MusicXML structures

### 5. Handwriting Recognition Agent
**Role**: PyTorch model training, ONNX optimization
- Trains handwriting model
- Optimizes for ONNX Runtime
- Tests recognition accuracy

## Workflow

## Quality Standards

### Lead Engineer Checklist
- [ ] Code follows UI skill
- [ ] Responsive design working
- [ ] TypeScript types complete
- [ ] No accessibility issues
- [ ] Tests added/updated
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Zero errors/warnings
