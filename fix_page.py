import re

with open("src/app/page.tsx", "r") as f:
    content = f.read()

# Fix unclosed Card in Analytics
content = content.replace("""                        </CardContent>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>""", """                        </CardContent>
                      </Card>
                    </div>
                    </ScrollArea>
                  </TabsContent>""")

with open("src/app/page.tsx", "w") as f:
    f.write(content)
