import re

with open("src/app/page.tsx", "r") as f:
    content = f.read()

content = content.replace("""                            </div>
                          </ScrollArea>
                        );
                      })()}""", """                            </div>
                          </ScrollArea>
                          </div>
                        );
                      })()}""")

with open("src/app/page.tsx", "w") as f:
    f.write(content)
